/**
 * Store Cleaners — Per-store cleanup functions for data retention
 *
 * Each cleanup function reads a data file, prunes entries that exceed
 * the configured retention policy (age or count), writes the result
 * back atomically, and returns the number of items removed.
 *
 * All functions are idempotent and handle missing files gracefully.
 */

import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { RetentionPolicy } from '@shared/types';

import { safeWriteJson } from '../../lib/safe-write-json';

// ── Types ────────────────────────────────────────────────────────

/** Signature for all store cleanup functions */
export type CleanupFn = (dataDir: string, retention: RetentionPolicy) => Promise<number>;

// ── Helpers ──────────────────────────────────────────────────────

/** Compute the cutoff timestamp from a maxAgeDays value. */
function ageCutoff(maxAgeDays: number): number {
  return Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
}

/**
 * Read a JSON file and return the parsed value, or `null` on any error.
 * Gracefully handles missing and corrupted files.
 */
function readJsonSafe(filePath: string): unknown {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Prune an array of items by age and/or count.
 *
 * Items are assumed to have a date field (ISO string) at `dateKey`.
 * Returns the pruned array. Items are kept in original order.
 */
function pruneArray<T>(
  items: T[],
  retention: RetentionPolicy,
  dateKey: keyof T,
): T[] {
  let result = [...items];

  // Filter by age
  if (retention.maxAgeDays !== undefined) {
    const cutoff = ageCutoff(retention.maxAgeDays);
    result = result.filter((item) => {
      const dateValue = item[dateKey];
      if (typeof dateValue !== 'string') return true;
      return new Date(dateValue).getTime() > cutoff;
    });
  }

  // Cap by count (keep the most recent)
  if (retention.maxItems !== undefined && result.length > retention.maxItems) {
    // Sort descending by date to keep newest, then trim
    result.sort((a, b) => {
      const aDate = a[dateKey];
      const bDate = b[dateKey];
      if (typeof aDate !== 'string' || typeof bDate !== 'string') return 0;
      return bDate.localeCompare(aDate);
    });
    result = result.slice(0, retention.maxItems);
  }

  return result;
}

// ── Wrapped-array cleaners { key: T[] } ─────────────────────────

/**
 * Clean a JSON file with structure `{ <wrapperKey>: T[] }`.
 * Used by notes, alerts, ideas, captures, assistant-watches, fitness-workouts.
 */
function cleanWrappedArray(
  dataDir: string,
  relativePath: string,
  wrapperKey: string,
  dateKey: string,
  retention: RetentionPolicy,
): number {
  const filePath = join(dataDir, relativePath);
  const data = readJsonSafe(filePath);
  if (data === null || typeof data !== 'object') return 0;

  const record = data as Record<string, unknown>;
  const items = record[wrapperKey];
  if (!Array.isArray(items)) return 0;

  const originalCount = items.length;
  const pruned = pruneArray(items as Array<Record<string, unknown>>, retention, dateKey as never);
  const removed = originalCount - pruned.length;

  if (removed > 0) {
    record[wrapperKey] = pruned;
    safeWriteJson(filePath, record);
  }

  return removed;
}

// ── Flat-array cleaners (top-level array) ───────────────────────

/**
 * Clean a JSON file that is a top-level array `T[]`.
 * Used by error-log, notifications-cache.
 */
function cleanFlatArray(
  dataDir: string,
  relativePath: string,
  dateKey: string,
  retention: RetentionPolicy,
): number {
  const filePath = join(dataDir, relativePath);
  const data = readJsonSafe(filePath);
  if (!Array.isArray(data)) return 0;

  const originalCount = data.length;
  const pruned = pruneArray(data as Array<Record<string, unknown>>, retention, dateKey as never);
  const removed = originalCount - pruned.length;

  if (removed > 0) {
    safeWriteJson(filePath, pruned);
  }

  return removed;
}

// ── Directory cleaners ──────────────────────────────────────────

/**
 * Clean a directory by removing entries older than maxAgeDays based on mtime.
 * Removes both files and subdirectories.
 */
function cleanDirectory(
  dataDir: string,
  relativePath: string,
  retention: RetentionPolicy,
): number {
  const dirPath = join(dataDir, relativePath);
  if (!existsSync(dirPath)) return 0;

  let removed = 0;
  const cutoff = retention.maxAgeDays === undefined ? 0 : ageCutoff(retention.maxAgeDays);
  if (cutoff === 0) return 0;

  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      try {
        const stats = statSync(entryPath);
        if (stats.mtimeMs < cutoff) {
          rmSync(entryPath, { recursive: true, force: true });
          removed += 1;
        }
      } catch {
        // Skip entries we can't stat (e.g. permission errors)
      }
    }
  } catch {
    // Directory unreadable — return 0
  }

  return removed;
}

// ── Specific cleaners ───────────────────────────────────────────

function cleanErrorLog(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(cleanFlatArray(dataDir, 'error-log.json', 'timestamp', retention));
}

function cleanNotes(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(cleanWrappedArray(dataDir, 'notes.json', 'notes', 'createdAt', retention));
}

function cleanAlerts(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(
    cleanWrappedArray(dataDir, 'alerts.json', 'alerts', 'createdAt', retention),
  );
}

function cleanIdeas(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(cleanWrappedArray(dataDir, 'ideas.json', 'ideas', 'createdAt', retention));
}

function cleanFitnessWorkouts(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(
    cleanWrappedArray(dataDir, 'fitness/workouts.json', 'items', 'createdAt', retention),
  );
}

function cleanCaptures(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(
    cleanWrappedArray(dataDir, 'captures.json', 'captures', 'createdAt', retention),
  );
}

function cleanAssistantWatches(dataDir: string, retention: RetentionPolicy): Promise<number> {
  // Only prune triggered watches — active watches should not be cleaned
  const filePath = join(dataDir, 'assistant-watches.json');
  const data = readJsonSafe(filePath);
  if (data === null || typeof data !== 'object') return Promise.resolve(0);

  const record = data as Record<string, unknown>;
  const { watches } = record;
  if (!Array.isArray(watches)) return Promise.resolve(0);

  const originalCount = watches.length;
  const cutoff =
    retention.maxAgeDays === undefined ? 0 : ageCutoff(retention.maxAgeDays);

  const pruned = (watches as Array<Record<string, unknown>>).filter((w) => {
    // Keep all active (non-triggered) watches
    if (w.triggered === true) {
      // For triggered watches, remove if older than cutoff
      if (cutoff > 0 && typeof w.createdAt === 'string') {
        return new Date(w.createdAt).getTime() > cutoff;
      }
      return true;
    }
    return true;
  });

  const removed = originalCount - pruned.length;
  if (removed > 0) {
    record.watches = pruned;
    safeWriteJson(filePath, record);
  }

  return Promise.resolve(removed);
}

function cleanPlanner(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(cleanDirectory(dataDir, 'planner', retention));
}

function cleanEmailQueue(dataDir: string, retention: RetentionPolicy): Promise<number> {
  // Remove failed queue entries older than the retention threshold
  const filePath = join(dataDir, 'email-queue.json');
  const data = readJsonSafe(filePath);
  if (!Array.isArray(data)) return Promise.resolve(0);

  const originalCount = data.length;
  const cutoff =
    retention.maxAgeDays === undefined ? 0 : ageCutoff(retention.maxAgeDays);

  const pruned = (data as Array<Record<string, unknown>>).filter((entry) => {
    // Only prune failed or sent entries — leave queued entries for retry
    if (entry.status === 'queued') return true;
    if (cutoff > 0 && typeof entry.createdAt === 'string') {
      return new Date(entry.createdAt).getTime() > cutoff;
    }
    return true;
  });

  const removed = originalCount - pruned.length;
  if (removed > 0) {
    safeWriteJson(filePath, pruned);
  }

  return Promise.resolve(removed);
}

function cleanBriefings(dataDir: string, retention: RetentionPolicy): Promise<number> {
  const filePath = join(dataDir, 'briefings.json');
  const data = readJsonSafe(filePath);
  if (data === null || typeof data !== 'object') return Promise.resolve(0);

  const record = data as Record<string, unknown>;
  const { briefings } = record;
  if (!Array.isArray(briefings)) return Promise.resolve(0);

  const originalCount = briefings.length;
  const maxItems = retention.maxItems ?? 30;

  if (originalCount <= maxItems) return Promise.resolve(0);

  // Keep the most recent briefings (they are appended chronologically)
  record.briefings = briefings.slice(-maxItems);
  safeWriteJson(filePath, record);

  return Promise.resolve(originalCount - maxItems);
}

function cleanNotificationsCache(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(
    cleanFlatArray(dataDir, 'notifications-cache.json', 'receivedAt', retention),
  );
}

function cleanProgress(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(cleanDirectory(dataDir, 'progress', retention));
}

function cleanQa(dataDir: string, retention: RetentionPolicy): Promise<number> {
  return Promise.resolve(cleanDirectory(dataDir, 'qa', retention));
}

// ── Exported map ────────────────────────────────────────────────

/**
 * Map of store IDs to their cleanup functions.
 *
 * Only stores with meaningful cleanup logic are included.
 * Config stores, sensitive stores, and stores without retention
 * are intentionally omitted.
 */
export const STORE_CLEANUP_FUNCTIONS: Record<string, CleanupFn> = {
  'error-log': cleanErrorLog,
  notes: cleanNotes,
  alerts: cleanAlerts,
  ideas: cleanIdeas,
  'fitness-workouts': cleanFitnessWorkouts,
  captures: cleanCaptures,
  'assistant-watches': cleanAssistantWatches,
  planner: cleanPlanner,
  'email-queue': cleanEmailQueue,
  briefings: cleanBriefings,
  'notifications-cache': cleanNotificationsCache,
  progress: cleanProgress,
  qa: cleanQa,
};
