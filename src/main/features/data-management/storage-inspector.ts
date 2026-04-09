/**
 * Storage Inspector — Calculates disk usage for each data store in the registry
 *
 * Inspects all data stores registered in DATA_STORE_REGISTRY, computing
 * file sizes, item counts (for JSON arrays), and oldest entry dates.
 * All file operations are wrapped in try/catch for graceful degradation.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { DataStoreUsage } from '@shared/types';

import { DATA_STORE_REGISTRY } from './store-registry';

// ── Types ────────────────────────────────────────────────────────

interface StorageInspectorDeps {
  dataDir: string;
}

export interface StorageInspector {
  /** Get disk usage for every store in the registry */
  getUsage: () => DataStoreUsage[];
  /** Get total disk usage across all stores (bytes) */
  getTotalUsage: () => number;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Date field candidates to search for when computing oldest entry. */
const DATE_FIELD_CANDIDATES = ['createdAt', 'date', 'timestamp', 'receivedAt'] as const;

/**
 * Try to find the earliest date string in an array of objects.
 * Returns the ISO date string of the oldest entry, or undefined.
 */
function findOldestDate(items: unknown[]): string | undefined {
  let oldest: string | undefined;
  let oldestMs = Number.POSITIVE_INFINITY;

  for (const item of items) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    const record = item as Record<string, unknown>;

    for (const field of DATE_FIELD_CANDIDATES) {
      const value = record[field];
      if (typeof value !== 'string') {
        continue;
      }

      const ms = new Date(value).getTime();
      if (!Number.isNaN(ms) && ms < oldestMs) {
        oldestMs = ms;
        oldest = value;
      }
      break; // Use the first matching date field per item
    }
  }

  return oldest;
}

/**
 * Parse a JSON file and extract the array of items from it.
 * Handles both top-level arrays and wrapped `{ key: T[] }` structures.
 * Returns the items array and item count, or null on failure.
 */
function parseJsonItems(filePath: string): { items: unknown[]; count: number } | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as unknown;

    // Top-level array
    if (Array.isArray(data)) {
      return { items: data, count: data.length };
    }

    // Wrapped object — find the first array-valued property
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      for (const value of Object.values(record)) {
        if (Array.isArray(value)) {
          return { items: value, count: value.length };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Compute the total byte size of all immediate children in a directory.
 * Returns { sizeBytes, itemCount } or zeroes if the directory is missing.
 */
function inspectDirectory(dirPath: string): { sizeBytes: number; itemCount: number } {
  if (!existsSync(dirPath)) {
    return { sizeBytes: 0, itemCount: 0 };
  }

  try {
    const entries = readdirSync(dirPath);
    let totalSize = 0;

    for (const entry of entries) {
      try {
        const entryStats = statSync(join(dirPath, entry));
        totalSize += entryStats.size;
      } catch {
        // Skip entries we can't stat
      }
    }

    return { sizeBytes: totalSize, itemCount: entries.length };
  } catch {
    return { sizeBytes: 0, itemCount: 0 };
  }
}

/**
 * Inspect a single JSON file store.
 * Returns size, item count (for arrays), and oldest entry date.
 */
function inspectFile(
  filePath: string,
): { sizeBytes: number; itemCount: number; oldestEntry?: string } {
  if (!existsSync(filePath)) {
    return { sizeBytes: 0, itemCount: 0 };
  }

  try {
    const fileStats = statSync(filePath);
    const sizeBytes = fileStats.size;

    // Try to parse as JSON array for item count and oldest entry
    const parsed = parseJsonItems(filePath);
    if (parsed !== null) {
      const oldestEntry = findOldestDate(parsed.items);
      return { sizeBytes, itemCount: parsed.count, oldestEntry };
    }

    return { sizeBytes, itemCount: 0 };
  } catch {
    return { sizeBytes: 0, itemCount: 0 };
  }
}

// ── Factory ──────────────────────────────────────────────────────

export function createStorageInspector(deps: StorageInspectorDeps): StorageInspector {
  return {
    getUsage(): DataStoreUsage[] {
      return DATA_STORE_REGISTRY.map((store) => {
        const fullPath = join(deps.dataDir, store.filePath);

        if (store.isDirectory) {
          const { sizeBytes, itemCount } = inspectDirectory(fullPath);
          return { id: store.id, sizeBytes, itemCount };
        }

        const { sizeBytes, itemCount, oldestEntry } = inspectFile(fullPath);
        const usage: DataStoreUsage = { id: store.id, sizeBytes, itemCount };
        if (oldestEntry !== undefined) {
          usage.oldestEntry = oldestEntry;
        }
        return usage;
      });
    },

    getTotalUsage(): number {
      const usages = this.getUsage();
      let total = 0;
      for (const usage of usages) {
        total += usage.sizeBytes;
      }
      return total;
    },
  };
}
