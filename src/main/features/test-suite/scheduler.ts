/**
 * Test Suite Scheduler Service — setInterval-based periodic test runs
 *
 * Polls every 30s for due schedules, fires the provided trigger callback, and
 * updates lastRunAt/nextRunAt. Notifications surface via electron.Notification.
 */

import { Notification } from 'electron';

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { testSuiteSchedules } from './schema-schedules';

import type { AdcDatabase } from '../../db';

const POLL_INTERVAL_MS = 30_000;

export interface ScheduleRecord {
  id: string;
  scriptId: string;
  projectId: string;
  intervalMs: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerService {
  list: (projectId: string) => ScheduleRecord[];
  get: (id: string) => ScheduleRecord | null;
  create: (params: {
    scriptId: string;
    projectId: string;
    intervalMs: number;
  }) => ScheduleRecord;
  update: (
    id: string,
    params: { intervalMs?: number; enabled?: boolean },
  ) => ScheduleRecord | null;
  delete: (id: string) => void;
  start: (onTrigger: (schedule: ScheduleRecord) => void) => void;
  stop: () => void;
}

function rowToRecord(row: typeof testSuiteSchedules.$inferSelect): ScheduleRecord {
  return {
    id: row.id,
    scriptId: row.scriptId,
    projectId: row.projectId,
    intervalMs: row.intervalMs,
    enabled: row.enabled,
    lastRunAt: row.lastRunAt ?? null,
    nextRunAt: row.nextRunAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function tickOnce(db: AdcDatabase, onTrigger: (schedule: ScheduleRecord) => void): void {
  const now = new Date().toISOString();
  const allSchedules = db.select().from(testSuiteSchedules).all().map(rowToRecord);

  for (const schedule of allSchedules) {
    if (!schedule.enabled) continue;
    if (!schedule.nextRunAt) continue;
    if (schedule.nextRunAt > now) continue;

    const nextRun = new Date(Date.now() + schedule.intervalMs).toISOString();
    db.update(testSuiteSchedules)
      .set({ lastRunAt: now, nextRunAt: nextRun, updatedAt: now })
      .where(eq(testSuiteSchedules.id, schedule.id))
      .run();

    onTrigger(schedule);
  }
}

export function createScheduler(db: AdcDatabase): SchedulerService {
  let checkInterval: ReturnType<typeof setInterval> | null = null;

  const service: SchedulerService = {
    list(projectId) {
      return db
        .select()
        .from(testSuiteSchedules)
        .where(eq(testSuiteSchedules.projectId, projectId))
        .all()
        .map(rowToRecord);
    },

    get(id) {
      const rows = db
        .select()
        .from(testSuiteSchedules)
        .where(eq(testSuiteSchedules.id, id))
        .all();
      const row = rows.at(0);
      return row ? rowToRecord(row) : null;
    },

    create(params) {
      const now = new Date().toISOString();
      const nextRun = new Date(Date.now() + params.intervalMs).toISOString();
      const id = nanoid();

      const record: ScheduleRecord = {
        id,
        scriptId: params.scriptId,
        projectId: params.projectId,
        intervalMs: params.intervalMs,
        enabled: true,
        lastRunAt: null,
        nextRunAt: nextRun,
        createdAt: now,
        updatedAt: now,
      };

      db.insert(testSuiteSchedules).values(record).run();

      return record;
    },

    update(id, params) {
      const existing = service.get(id);
      if (!existing) return null;

      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (params.intervalMs !== undefined) {
        updates.intervalMs = params.intervalMs;
        updates.nextRunAt = new Date(Date.now() + params.intervalMs).toISOString();
      }
      if (params.enabled !== undefined) updates.enabled = params.enabled;

      db.update(testSuiteSchedules)
        .set(updates)
        .where(eq(testSuiteSchedules.id, id))
        .run();

      return service.get(id);
    },

    delete(id) {
      db.delete(testSuiteSchedules).where(eq(testSuiteSchedules.id, id)).run();
    },

    start(onTrigger) {
      if (checkInterval) return;
      checkInterval = setInterval(() => tickOnce(db, onTrigger), POLL_INTERVAL_MS);
    },

    stop() {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    },
  };

  return service;
}

export function sendTestNotification(scriptName: string, status: string): void {
  new Notification({
    title: `Test ${status}: ${scriptName}`,
    body:
      status === 'failed'
        ? `Scheduled run of "${scriptName}" failed. Check the results panel.`
        : `Scheduled run of "${scriptName}" passed.`,
  }).show();
}
