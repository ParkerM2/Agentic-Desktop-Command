/**
 * Alert Service — Manages alerts/reminders with recurring support
 *
 * Persists to SQLite `alerts` table via Drizzle ORM.
 * One-time migration from alerts.json on first access.
 * Checks for due alerts every 60 seconds.
 * Emits 'event:alert.triggered' when an alert is due.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import { ALERTS_EVENTS } from '@shared/ipc/misc/alerts.channels';
import { generateId } from '@shared/lib/id';
import type { Alert, AlertLinkedTo, RecurringConfig } from '@shared/types';

import { alerts } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('alert-service');

export interface AlertService {
  createAlert: (data: CreateAlertInput) => Alert;
  listAlerts: (includeExpired?: boolean) => Alert[];
  updateAlert: (data: UpdateAlertInput) => Alert;
  dismissAlert: (id: string) => Alert;
  deleteAlert: (id: string) => { success: boolean };
  checkAlerts: () => void;
  startChecking: () => void;
  stopChecking: () => void;
}

interface CreateAlertInput {
  id?: string;
  type: Alert['type'];
  message: string;
  triggerAt: string;
  recurring?: RecurringConfig;
  linkedTo?: AlertLinkedTo;
}

interface UpdateAlertInput {
  id: string;
  message?: string;
  triggerAt?: string;
  recurring?: RecurringConfig | null;
  linkedTo?: AlertLinkedTo;
}

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(alerts).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'alerts.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { alerts?: Alert[] };
    const items = Array.isArray(parsed.alerts) ? parsed.alerts : [];

    for (const item of items) {
      db.insert(alerts).values({
        id: item.id,
        type: item.type,
        message: item.message,
        triggerAt: item.triggerAt,
        recurring: item.recurring ?? null,
        linkedTo: item.linkedTo ?? null,
        dismissed: item.dismissed,
        createdAt: item.createdAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} alerts from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate alerts from JSON:', err);
  }
}

/** Convert a DB row to the Alert domain type. */
function rowToAlert(row: typeof alerts.$inferSelect): Alert {
  return {
    id: row.id,
    type: row.type as Alert['type'],
    message: row.message,
    triggerAt: row.triggerAt,
    recurring: (row.recurring as RecurringConfig | null) ?? undefined,
    linkedTo: (row.linkedTo as AlertLinkedTo | null) ?? undefined,
    dismissed: row.dismissed,
    createdAt: row.createdAt,
  };
}

export function createAlertService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): AlertService {
  const { db, router, dataDir } = deps;
  let checkInterval: ReturnType<typeof setInterval> | null = null;

  migrateFromJson(db, dataDir);

  function findAlert(id: string): Alert {
    const row = db.select().from(alerts).where(eq(alerts.id, id)).get();
    if (!row) {
      throw new Error(`Alert not found: ${id}`);
    }
    return rowToAlert(row);
  }

  function createNextOccurrence(alert: Alert): void {
    if (!alert.recurring) return;

    const nextDate = calculateNextOccurrence(new Date(alert.triggerAt), alert.recurring);
    if (!nextDate) return;

    const nextAlert = {
      id: generateId(),
      type: alert.type,
      message: alert.message,
      triggerAt: nextDate.toISOString(),
      recurring: alert.recurring,
      linkedTo: alert.linkedTo ?? null,
      dismissed: false,
      createdAt: new Date().toISOString(),
    };

    db.insert(alerts).values(nextAlert).run();
  }

  function calculateNextOccurrence(current: Date, config: RecurringConfig): Date | null {
    const next = new Date(current);

    switch (config.frequency) {
      case 'daily': {
        next.setDate(next.getDate() + 1);
        return next;
      }
      case 'weekly': {
        if (config.daysOfWeek && config.daysOfWeek.length > 0) {
          const currentDay = next.getDay();
          const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);

          // Find next day of week after current
          const nextDay = sortedDays.find((d) => d > currentDay);
          if (nextDay === undefined) {
            // Wrap around to first day of next week
            const firstDay = sortedDays[0];
            next.setDate(next.getDate() + (7 - currentDay + firstDay));
          } else {
            next.setDate(next.getDate() + (nextDay - currentDay));
          }
          return next;
        }
        next.setDate(next.getDate() + 7);
        return next;
      }
      case 'monthly': {
        next.setMonth(next.getMonth() + 1);
        return next;
      }
      default: {
        return null;
      }
    }
  }

  function checkDueAlerts(): void {
    const now = new Date();
    const undismissed = db.select().from(alerts)
      .where(eq(alerts.dismissed, false))
      .all();

    for (const row of undismissed) {
      const triggerDate = new Date(row.triggerAt);
      if (triggerDate <= now) {
        router.emit(ALERTS_EVENTS.ALERT.TRIGGERED, {
          alertId: row.id,
          message: row.message,
        });
      }
    }
  }

  return {
    createAlert(data) {
      const now = new Date().toISOString();
      const alert = {
        id: data.id ?? generateId(),
        type: data.type,
        message: data.message,
        triggerAt: data.triggerAt,
        recurring: data.recurring ?? null,
        linkedTo: data.linkedTo ?? null,
        dismissed: false,
        createdAt: now,
      };
      db.insert(alerts).values(alert).run();

      const result = rowToAlert(alert as typeof alerts.$inferSelect);
      router.emit(ALERTS_EVENTS.ALERT.CHANGED, { alertId: alert.id });
      return result;
    },

    listAlerts(includeExpired = false) {
      const allRows = db.select().from(alerts).all();
      const allAlerts = allRows.map(rowToAlert);

      if (includeExpired) {
        return allAlerts;
      }
      const now = new Date();
      return allAlerts.filter((a) => !a.dismissed || new Date(a.triggerAt) > now);
    },

    updateAlert(data) {
      const { id, ...fields } = data;
      const updates: Partial<typeof alerts.$inferInsert> = {};
      if (fields.message !== undefined) updates.message = fields.message;
      if (fields.triggerAt !== undefined) updates.triggerAt = fields.triggerAt;
      if ('recurring' in fields) updates.recurring = fields.recurring ?? null;
      if (fields.linkedTo !== undefined) updates.linkedTo = fields.linkedTo ?? null;

      db.update(alerts).set(updates).where(eq(alerts.id, id)).run();
      const updated = findAlert(id);
      router.emit(ALERTS_EVENTS.ALERT.CHANGED, { alertId: id });
      return updated;
    },

    dismissAlert(id) {
      const alert = findAlert(id);
      db.update(alerts).set({ dismissed: true }).where(eq(alerts.id, id)).run();
      alert.dismissed = true;

      // For recurring alerts, create the next occurrence
      if (alert.recurring) {
        createNextOccurrence(alert);
      }

      router.emit(ALERTS_EVENTS.ALERT.CHANGED, { alertId: alert.id });
      return alert;
    },

    deleteAlert(id) {
      const result = db.delete(alerts).where(eq(alerts.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Alert not found: ${id}`);
      }
      router.emit(ALERTS_EVENTS.ALERT.CHANGED, { alertId: id });
      return { success: true };
    },

    checkAlerts() {
      checkDueAlerts();
    },

    startChecking() {
      if (checkInterval) return;
      checkInterval = setInterval(() => {
        checkDueAlerts();
      }, 60_000);
    },

    stopChecking() {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    },
  };
}
