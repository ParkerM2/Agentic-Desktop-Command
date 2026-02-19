/**
 * Alert Service — Manages alerts/reminders with recurring support
 *
 * Persists to userData/alerts.json. Checks for due alerts every 60 seconds.
 * Emits 'event:alert.triggered' when an alert is due.
 */

import { randomUUID } from 'node:crypto';

import type { Alert, AlertLinkedTo, RecurringConfig } from '@shared/types';

import { loadAlerts, saveAlerts } from './alert-store';

import type { IpcRouter } from '../../ipc/router';

export interface AlertService {
  createAlert: (data: CreateAlertInput) => Alert;
  listAlerts: (includeExpired?: boolean) => Alert[];
  dismissAlert: (id: string) => Alert;
  deleteAlert: (id: string) => { success: boolean };
  checkAlerts: () => void;
  startChecking: () => void;
  stopChecking: () => void;
}

interface CreateAlertInput {
  type: Alert['type'];
  message: string;
  triggerAt: string;
  recurring?: RecurringConfig;
  linkedTo?: AlertLinkedTo;
}

export function createAlertService(router: IpcRouter): AlertService {
  const alerts: Alert[] = loadAlerts();
  let checkInterval: ReturnType<typeof setInterval> | null = null;

  function persist(): void {
    saveAlerts(alerts);
  }

  function findAlertIndex(id: string): number {
    const index = alerts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Alert not found: ${id}`);
    }
    return index;
  }

  function createNextOccurrence(alert: Alert): void {
    if (!alert.recurring) return;

    const nextDate = calculateNextOccurrence(new Date(alert.triggerAt), alert.recurring);
    if (!nextDate) return;

    const nextAlert: Alert = {
      id: randomUUID(),
      type: alert.type,
      message: alert.message,
      triggerAt: nextDate.toISOString(),
      recurring: alert.recurring,
      linkedTo: alert.linkedTo,
      dismissed: false,
      createdAt: new Date().toISOString(),
    };

    alerts.push(nextAlert);
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

  return {
    createAlert(data) {
      const alert: Alert = {
        id: randomUUID(),
        type: data.type,
        message: data.message,
        triggerAt: data.triggerAt,
        recurring: data.recurring,
        linkedTo: data.linkedTo,
        dismissed: false,
        createdAt: new Date().toISOString(),
      };
      alerts.push(alert);
      persist();
      router.emit('event:alert.changed', { alertId: alert.id });
      return alert;
    },

    listAlerts(includeExpired = false) {
      if (includeExpired) {
        return [...alerts];
      }
      const now = new Date();
      return alerts.filter((a) => !a.dismissed || new Date(a.triggerAt) > now);
    },

    dismissAlert(id) {
      const index = findAlertIndex(id);
      const alert = alerts[index];
      alert.dismissed = true;

      // For recurring alerts, create the next occurrence
      if (alert.recurring) {
        createNextOccurrence(alert);
      }

      persist();
      router.emit('event:alert.changed', { alertId: alert.id });
      return alert;
    },

    deleteAlert(id) {
      const index = findAlertIndex(id);
      alerts.splice(index, 1);
      persist();
      router.emit('event:alert.changed', { alertId: id });
      return { success: true };
    },

    checkAlerts() {
      const now = new Date();
      for (const alert of alerts) {
        if (alert.dismissed) continue;
        const triggerDate = new Date(alert.triggerAt);
        if (triggerDate <= now) {
          router.emit('event:alert.triggered', {
            alertId: alert.id,
            message: alert.message,
          });
        }
      }
    },

    startChecking() {
      if (checkInterval) return;
      checkInterval = setInterval(() => {
        const now = new Date();
        for (const alert of alerts) {
          if (alert.dismissed) continue;
          const triggerDate = new Date(alert.triggerAt);
          if (triggerDate <= now) {
            router.emit('event:alert.triggered', {
              alertId: alert.id,
              message: alert.message,
            });
          }
        }
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
