/**
 * App Update Service — Wraps electron-updater with graceful fallback
 *
 * If electron-updater is not installed or fails to import, all methods
 * return no-op/stub values so the app continues to function.
 */

import { app, shell } from 'electron';

import { APP_EVENTS } from '@shared/ipc/app/channels';
import type { AppChannel } from '@shared/types/channel';

import { appLogger } from '@main/lib/logger';

import type { IpcRouter } from '../../ipc/router';

const GITHUB_RELEASES_API =
  'https://api.github.com/repos/ParkerM2/Agentic-Desktop-Command/releases/latest';
const GITHUB_RELEASES_PAGE =
  'https://github.com/ParkerM2/Agentic-Desktop-Command/releases/latest';

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

function isNewerSemver(remote: string, current: string): boolean {
  const parse = (v: string): number[] =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((p) => {
        const n = Number.parseInt(p, 10);
        return Number.isNaN(n) ? 0 : n;
      });
  const r = parse(remote);
  const c = parse(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const ri = r[i] ?? 0;
    const ci = c[i] ?? 0;
    if (ri !== ci) return ri > ci;
  }
  return false;
}

interface GitHubReleaseInfo {
  version: string;
  htmlUrl: string;
}

async function fetchLatestGitHubRelease(): Promise<GitHubReleaseInfo | null> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) {
      appLogger.warn(`[AppUpdateService] GitHub releases API responded ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    if (!data.tag_name || !data.html_url) return null;
    return { version: data.tag_name.replace(/^v/, ''), htmlUrl: data.html_url };
  } catch (err) {
    appLogger.warn('[AppUpdateService] GitHub releases fetch failed:', err);
    return null;
  }
}

function loadAutoUpdater(): AutoUpdaterLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const updaterModule = require('electron-updater') as {
      autoUpdater: AutoUpdaterLike;
    };
    appLogger.info('[AppUpdateService] electron-updater loaded successfully');
    return updaterModule.autoUpdater;
  } catch {
    appLogger.warn('[AppUpdateService] electron-updater not available — updates disabled');
    return null;
  }
}

// ── Factory ──────────────────────────────────────────────────

export interface AppUpdateServiceDeps {
  router: IpcRouter;
  channel: AppChannel;
}

export function createAppUpdateService(deps: AppUpdateServiceDeps): AppUpdateService {
  const { router, channel } = deps;

  const status: UpdateStatus = {
    checking: false,
    updateAvailable: false,
    downloading: false,
    downloaded: false,
  };

  // Non-release channels are local binaries — self-update would
  // overwrite them with the real release build. Always no-op.
  if (channel !== 'release') {
    appLogger.info(`[AppUpdateService] Auto-updater disabled on channel=${channel}`);
    return {
      checkForUpdates: () => ({ updateAvailable: false }),
      downloadUpdate: () => ({ success: false }),
      quitAndInstall: () => ({ success: false }),
      getStatus: () => ({ ...status }),
    };
  }

  // macOS unsigned builds cannot use Squirrel.Mac (signature required).
  // Fall back to manual flow: poll GitHub Releases API and open the
  // download page in the browser. User drags the new .app to /Applications.
  if (process.platform === 'darwin') {
    appLogger.info('[AppUpdateService] macOS manual-update mode — unsigned build');
    let downloadUrl: string = GITHUB_RELEASES_PAGE;

    async function runCheck(): Promise<void> {
      status.checking = true;
      status.error = undefined;
      const latest = await fetchLatestGitHubRelease();
      status.checking = false;
      if (!latest) return;
      const current = app.getVersion();
      if (!isNewerSemver(latest.version, current)) {
        appLogger.info(
          `[AppUpdateService] No update (current=${current}, latest=${latest.version})`,
        );
        return;
      }
      status.updateAvailable = true;
      status.version = latest.version;
      downloadUrl = latest.htmlUrl;
      appLogger.info(`[AppUpdateService] Manual update available: ${latest.version}`);
      router.emit(APP_EVENTS.UPDATE.AVAILABLE, { version: latest.version });
    }

    return {
      checkForUpdates() {
        void runCheck();
        return { updateAvailable: status.updateAvailable, version: status.version };
      },
      downloadUpdate() {
        void shell.openExternal(downloadUrl);
        return { success: true };
      },
      quitAndInstall: () => ({ success: false }),
      getStatus: () => ({ ...status }),
    };
  }

  const updater = loadAutoUpdater();

  // Wire autoUpdater events if available
  if (updater) {
    updater.on('checking-for-update', () => {
      status.checking = true;
      status.error = undefined;
      appLogger.info('[AppUpdateService] Checking for updates...');
    });

    updater.on('update-available', (...args: unknown[]) => {
      status.checking = false;
      status.updateAvailable = true;
      const info = args[0] as { version?: string } | undefined;
      status.version = info?.version;
      appLogger.info('[AppUpdateService] Update available:', status.version ?? 'unknown');
      router.emit(APP_EVENTS.UPDATE.AVAILABLE, { version: status.version ?? 'unknown' });
    });

    updater.on('update-not-available', () => {
      status.checking = false;
      status.updateAvailable = false;
      appLogger.info('[AppUpdateService] No update available');
    });

    updater.on('download-progress', () => {
      status.downloading = true;
    });

    updater.on('update-downloaded', (...args: unknown[]) => {
      status.downloading = false;
      status.downloaded = true;
      const info = args[0] as { version?: string } | undefined;
      status.version = info?.version;
      appLogger.info('[AppUpdateService] Update downloaded:', status.version ?? 'unknown');
      router.emit(APP_EVENTS.UPDATE.DOWNLOADED, { version: status.version ?? 'unknown' });
    });

    updater.on('error', (...args: unknown[]) => {
      status.checking = false;
      status.downloading = false;
      const error = args[0] as Error | undefined;
      status.error = error?.message ?? 'Unknown update error';
      appLogger.error('[AppUpdateService] Error:', status.error);
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
