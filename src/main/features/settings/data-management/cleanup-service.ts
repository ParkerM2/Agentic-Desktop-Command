/**
 * Cleanup Service — Central orchestrator for data retention cleanup
 *
 * Reads the store registry and user retention settings, then runs
 * each store's cleanup function with appropriate thresholds.
 * Periodic cleanup runs on a configurable interval.
 */

import { DATA_MANAGEMENT_EVENTS } from '@shared/ipc/data-management/channels';
import type { DataRetentionSettings, RetentionPolicy } from '@shared/types';


import { createScopedLogger } from '@main/lib/logger';

import { STORE_CLEANUP_FUNCTIONS } from './store-cleaners';
import { DATA_STORE_REGISTRY } from './store-registry';

import type { CleanupFn } from './store-cleaners';
import type { IpcRouter } from '../../../ipc/router';

// ─── Types ────────────────────────────────────────────────────

export interface CleanupServiceDeps {
  dataDir: string;
  getRetentionSettings: () => DataRetentionSettings | undefined;
  router: IpcRouter;
}

export interface CleanupService {
  runCleanup: () => Promise<{ cleaned: number; freedBytes: number }>;
  start: () => void;
  dispose: () => void;
}

// ─── Constants ────────────────────────────────────────────────

const INITIAL_DELAY_MS = 30_000;
const MS_PER_HOUR = 3_600_000;
const DEFAULT_INTERVAL_HOURS = 24;
const UNKNOWN_ERROR = 'Unknown error';

const logger = createScopedLogger('cleanup');

// ─── Factory ──────────────────────────────────────────────────

export function createCleanupService(deps: CleanupServiceDeps): CleanupService {
  const { dataDir, getRetentionSettings, router } = deps;

  let initialTimer: ReturnType<typeof setTimeout> | undefined;
  let intervalTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * Merge user retention overrides with the store's default retention.
   * User overrides take precedence over defaults.
   */
  function mergeRetention(
    defaultRetention: RetentionPolicy,
    userOverride: RetentionPolicy | undefined,
  ): RetentionPolicy {
    if (userOverride === undefined) {
      return defaultRetention;
    }
    return {
      ...defaultRetention,
      ...userOverride,
    };
  }

  // ─── Public API ───────────────────────────────────────────

  async function runCleanup(): Promise<{ cleaned: number; freedBytes: number }> {
    const settings = getRetentionSettings();

    // If auto cleanup is explicitly disabled, skip
    if (settings !== undefined && !settings.autoCleanupEnabled) {
      logger.info('Auto cleanup disabled — skipping');
      return { cleaned: 0, freedBytes: 0 };
    }

    logger.info('Starting cleanup run...');
    let totalCleaned = 0;

    for (const store of DATA_STORE_REGISTRY) {
      if (!(store.id in STORE_CLEANUP_FUNCTIONS)) {
        continue;
      }
      const cleanFn: CleanupFn = STORE_CLEANUP_FUNCTIONS[store.id];

      // Merge default retention with user overrides
      const userOverride = settings?.overrides[store.id];
      const merged = mergeRetention(store.defaultRetention, userOverride);

      // Skip if retention is disabled for this store
      if (!merged.enabled) {
        continue;
      }

      try {
        const removed = await cleanFn(dataDir, merged);
        if (removed > 0) {
          logger.info(`Cleaned ${String(removed)} items from ${store.id}`);
        }
        totalCleaned += removed;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
        logger.error(`Cleanup failed for ${store.id}: ${message}`);
      }
    }

    const result = { cleaned: totalCleaned, freedBytes: 0 };

    logger.info(`Cleanup complete: ${String(totalCleaned)} items cleaned`);

    router.emit(DATA_MANAGEMENT_EVENTS.CLEANUP.COMPLETE, result);

    return result;
  }

  function start(): void {
    const settings = getRetentionSettings();
    const intervalHours = settings?.cleanupIntervalHours ?? DEFAULT_INTERVAL_HOURS;

    initialTimer = setTimeout(() => {
      void runCleanup();

      intervalTimer = setInterval(() => {
        void runCleanup();
      }, intervalHours * MS_PER_HOUR);
    }, INITIAL_DELAY_MS);

    logger.info(
      `Cleanup scheduled: initial in ${String(INITIAL_DELAY_MS / 1000)}s, then every ${String(intervalHours)}h`,
    );
  }

  function dispose(): void {
    if (initialTimer !== undefined) {
      clearTimeout(initialTimer);
      initialTimer = undefined;
    }
    if (intervalTimer !== undefined) {
      clearInterval(intervalTimer);
      intervalTimer = undefined;
    }
    logger.info('Cleanup service disposed');
  }

  return {
    runCleanup,
    start,
    dispose,
  };
}
