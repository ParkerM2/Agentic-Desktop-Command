/**
 * Data Management IPC handlers
 *
 * Maps data management IPC channels to service operations:
 * store registry, usage inspection, retention settings,
 * cleanup, export, and import.
 */

import { DATA_MANAGEMENT } from '@shared/ipc/data-management/channels';
import type { DataRetentionSettings } from '@shared/types';

import { exportData, importData } from "./data-export";
import { STORE_CLEANUP_FUNCTIONS } from "./store-cleaners";
import { DATA_STORE_REGISTRY } from "./store-registry";

import type { CleanupService } from "./cleanup-service";
import type { StorageInspector } from "./storage-inspector";
import type { IpcRouter } from '../../ipc/router';
import type { SettingsService } from '../settings/settings-service';

const DEFAULT_RETENTION_SETTINGS: DataRetentionSettings = {
  autoCleanupEnabled: true,
  cleanupIntervalHours: 6,
  overrides: {},
};

export function registerDataManagementHandlers(
  router: IpcRouter,
  cleanupService: CleanupService,
  storageInspector: StorageInspector,
  settingsService: SettingsService,
  dataDir: string,
): void {
  router.handle(DATA_MANAGEMENT.GET.REGISTRY, () =>
    Promise.resolve(DATA_STORE_REGISTRY),
  );

  router.handle(DATA_MANAGEMENT.GET.USAGE, () =>
    Promise.resolve(storageInspector.getUsage()),
  );

  router.handle(DATA_MANAGEMENT.GET.RETENTION, () => {
    const settings = settingsService.getSettings();
    const retention = settings.dataRetention ?? DEFAULT_RETENTION_SETTINGS;
    return Promise.resolve(retention);
  });

  router.handle(DATA_MANAGEMENT.UPDATE.RETENTION, (updates) => {
    const current = settingsService.getSettings().dataRetention ?? DEFAULT_RETENTION_SETTINGS;
    const merged: DataRetentionSettings = {
      ...current,
      ...updates,
    };
    settingsService.updateSettings({ dataRetention: merged });
    return Promise.resolve(merged);
  });

  router.handle(DATA_MANAGEMENT.CLEAR.STORE, async ({ storeId }) => {
    if (!Object.hasOwn(STORE_CLEANUP_FUNCTIONS, storeId)) {
      return { success: false };
    }

    // Run the cleaner with a maximally aggressive retention to clear everything
    await STORE_CLEANUP_FUNCTIONS[storeId](dataDir, { maxAgeDays: 0, maxItems: 0, enabled: true });
    return { success: true };
  });

  router.handle(DATA_MANAGEMENT.RUN.CLEANUP, () =>
    cleanupService.runCleanup(),
  );

  router.handle(DATA_MANAGEMENT.EXPORT.DATA, async () => {
    const filePath = await exportData(dataDir);
    return { filePath };
  });

  router.handle(DATA_MANAGEMENT.IMPORT.DATA, ({ filePath }) =>
    Promise.resolve(importData(dataDir, filePath)),
  );
}
