/**
 * Hub DB path migrator.
 *
 * Resolves the on-disk `adc.db` location for a given hub and performs the
 * one-time move of a legacy top-level `adc.db` into `hubs/legacy/adc.db`.
 *
 * Context: Task 16 introduced `HubConfigV2` with `hubs[]` + `activeHubId`.
 * Each `PersistedHubRecord` has a `dbPath` like `hubs/<hubId>/adc.db`.
 * This module provides the path resolution + the legacy-file relocation
 * so that the main-process DB opens from the correct per-hub location.
 *
 * The actual swap of the DB singleton on hub switch lands in Task 23.
 */

import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { hubLogger } from '../../lib/logger';

/** Synthetic hub id used when no hub has been paired yet (local-only mode). */
export const LOCAL_HUB_ID = 'local';

/** Hub id used for data migrated from the legacy pre-hubs[] layout. */
export const LEGACY_HUB_ID = 'legacy';

/**
 * Resolves the absolute path to the `adc.db` file for the given hub.
 *
 * - `resolveActiveDbPath(userData, 'abc')` → `userData/hubs/abc/adc.db`
 * - `resolveActiveDbPath(userData, null)`  → `userData/hubs/local/adc.db`
 *
 * @param userDataDir Absolute path to Electron `userData`.
 * @param activeHubId The active hub id, or `null` for local-only mode.
 */
export function resolveActiveDbPath(
  userDataDir: string,
  activeHubId: string | null,
): string {
  const hubId = activeHubId ?? LOCAL_HUB_ID;
  return join(userDataDir, 'hubs', hubId, 'adc.db');
}

export interface LegacyMigrationResult {
  moved: boolean;
  from?: string;
  to?: string;
}

/**
 * Moves a pre-existing top-level `adc.db` into `hubs/legacy/adc.db`
 * exactly once. Never overwrites an existing destination. Idempotent
 * after the first run because the source no longer exists.
 */
export function migrateLegacyDb(userDataDir: string): LegacyMigrationResult {
  const from = join(userDataDir, 'adc.db');
  const to = join(userDataDir, 'hubs', LEGACY_HUB_ID, 'adc.db');

  if (!existsSync(from)) {
    return { moved: false };
  }

  if (existsSync(to)) {
    hubLogger.warn(
      `[Hub] Legacy adc.db move skipped — destination already exists: ${to}`,
    );
    return { moved: false };
  }

  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);

  hubLogger.info(`[Hub] Moved legacy adc.db → ${to}`);
  return { moved: true, from, to };
}
