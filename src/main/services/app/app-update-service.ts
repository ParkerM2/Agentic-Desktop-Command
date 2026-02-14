/**
 * App Update Service — Wraps electron-updater with graceful fallback
 *
 * If electron-updater is not installed or fails to import, all methods
 * return no-op/stub values so the app continues to function.
 */

import type { IpcRouter } from '../../ipc/router';

// ── Types ────────────────────────────────────────────────────

interface UpdateStatus {
  checking: boolean;
  updateAvailable: boolean;
  downloading: boolean;
  downloaded: boolean;
  version?: string;
  error?: string;
}

interface AutoUpdaterLike {
  checkForUpdates: () => unknown;
  downloadUpdate: () => unknown;
  quitAndInstall: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
}

export interface AppUpdateService {
  /** Trigger an update check (returns current state; actual check is async) */
  checkForUpdates: () => { updateAvailable: boolean; version?: string };
  /** Start downloading the available update */
  downloadUpdate: () => { success: boolean };
  /** Quit the app and install the downloaded update */
  quitAndInstall: () => { success: boolean };
  /** Get current update status */
  getStatus: () => UpdateStatus;
}

// ── Helpers ──────────────────────────────────────────────────

function loadAutoUpdater(): AutoUpdaterLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const updaterModule = require('electron-updater') as {
      autoUpdater: AutoUpdaterLike;
    };
    console.log('[AppUpdateService] electron-updater loaded successfully');
    return updaterModule.autoUpdater;
  } catch {
    console.warn('[AppUpdateService] electron-updater not available — updates disabled');
    return null;
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createAppUpdateService(router: IpcRouter): AppUpdateService {
  const status: UpdateStatus = {
    checking: false,
    updateAvailable: false,
    downloading: false,
    downloaded: false,
  };

  const updater = loadAutoUpdater();

  // Wire autoUpdater events if available
  if (updater) {
    updater.on('checking-for-update', () => {
      status.checking = true;
      status.error = undefined;
      console.log('[AppUpdateService] Checking for updates...');
    });

    updater.on('update-available', (...args: unknown[]) => {
      status.checking = false;
      status.updateAvailable = true;
      const info = args[0] as { version?: string } | undefined;
      status.version = info?.version;
      console.log('[AppUpdateService] Update available:', status.version ?? 'unknown');
      router.emit('event:app.updateAvailable', { version: status.version ?? 'unknown' });
    });

    updater.on('update-not-available', () => {
      status.checking = false;
      status.updateAvailable = false;
      console.log('[AppUpdateService] No update available');
    });

    updater.on('download-progress', () => {
      status.downloading = true;
    });

    updater.on('update-downloaded', (...args: unknown[]) => {
      status.downloading = false;
      status.downloaded = true;
      const info = args[0] as { version?: string } | undefined;
      status.version = info?.version;
      console.log('[AppUpdateService] Update downloaded:', status.version ?? 'unknown');
      router.emit('event:app.updateDownloaded', { version: status.version ?? 'unknown' });
    });

    updater.on('error', (...args: unknown[]) => {
      status.checking = false;
      status.downloading = false;
      const error = args[0] as Error | undefined;
      status.error = error?.message ?? 'Unknown update error';
      console.error('[AppUpdateService] Error:', status.error);
    });
  }

  return {
    checkForUpdates() {
      if (updater) {
        void (updater.checkForUpdates() as Promise<unknown>);
      }
      return { updateAvailable: status.updateAvailable, version: status.version };
    },

    downloadUpdate() {
      if (updater) {
        void (updater.downloadUpdate() as Promise<unknown>);
        return { success: true };
      }
      return { success: false };
    },

    quitAndInstall() {
      if (updater && status.downloaded) {
        updater.quitAndInstall();
        return { success: true };
      }
      return { success: false };
    },

    getStatus() {
      return { ...status };
    },
  };
}
