/**
 * Alert Store — JSON file persistence for alerts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { app } from 'electron';

import type { Alert } from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

const ALERTS_FILE = 'alerts.json';

interface AlertStoreData {
  alerts: Alert[];
}

export interface AlertStore extends ReinitializableService {
  loadAlerts: () => Alert[];
  saveAlerts: (alerts: Alert[]) => void;
}

export function createAlertStore(deps: { dataDir: string }): AlertStore {
  let currentFilePath = join(deps.dataDir, ALERTS_FILE);
  let alertsCache: Alert[] | null = null;

  function loadFromDisk(): Alert[] {
    if (existsSync(currentFilePath)) {
      try {
        const raw = readFileSync(currentFilePath, 'utf-8');
        const data = JSON.parse(raw) as unknown as AlertStoreData;
        return Array.isArray(data.alerts) ? data.alerts : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  return {
    loadAlerts(): Alert[] {
      alertsCache ??= loadFromDisk();
      return alertsCache;
    },

    saveAlerts(alerts: Alert[]): void {
      const dir = dirname(currentFilePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const data: AlertStoreData = { alerts };
      writeFileSync(currentFilePath, JSON.stringify(data, null, 2), 'utf-8');
      alertsCache = alerts;
    },

    reinitialize(dataDir: string): void {
      currentFilePath = join(dataDir, ALERTS_FILE);
      alertsCache = null; // Force reload from new path
    },

    clearState(): void {
      alertsCache = null;
    },
  };
}

// Legacy exports for backward compatibility
// TODO: Migrate callers to use createAlertStore factory
const legacyDataDir = app.getPath('userData');
let legacyStore: AlertStore | null = null;

function getLegacyStore(): AlertStore {
  legacyStore ??= createAlertStore({ dataDir: legacyDataDir });
  return legacyStore;
}

export function loadAlerts(): Alert[] {
  return getLegacyStore().loadAlerts();
}

export function saveAlerts(alerts: Alert[]): void {
  getLegacyStore().saveAlerts(alerts);
}
