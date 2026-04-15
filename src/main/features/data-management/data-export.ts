/**
 * Data Export/Import — Exports and imports data store archives
 *
 * Export reads all exportable (non-sensitive) stores and writes a JSON archive.
 * Import reads an archive and merges data into existing stores.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { app, dialog } from 'electron';

import type { DataExportArchive } from '@shared/types';

import { createScopedLogger } from '@main/lib/logger';

import { DATA_STORE_REGISTRY } from './store-registry';

// ─── Constants ─────────────────────────────────────────────────

const ARCHIVE_VERSION = 1;
const logger = createScopedLogger('data-export');

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Read a JSON file and return the parsed value, or null on any error.
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

// ─── Export ────────────────────────────────────────────────────

/**
 * Export all non-sensitive, exportable stores to a JSON archive.
 * Opens a save dialog for the user to choose the output path.
 * Returns the chosen file path.
 */
export async function exportData(dataDir: string): Promise<string> {
  const result = await dialog.showSaveDialog({
    title: 'Export Application Data',
    defaultPath: `adc-export-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    throw new Error('Export cancelled by user');
  }

  const stores: Record<string, unknown> = {};

  for (const store of DATA_STORE_REGISTRY) {
    if (!store.canExport || store.sensitive) {
      continue;
    }

    // Skip directory stores for now — only export JSON files
    if (store.isDirectory) {
      continue;
    }

    const fullPath = join(dataDir, store.filePath);
    const data = readJsonSafe(fullPath);

    if (data !== null) {
      stores[store.id] = data;
    }
  }

  const archive: DataExportArchive = {
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    stores,
  };

  writeFileSync(result.filePath, JSON.stringify(archive, null, 2), 'utf-8');
  logger.info(`Exported ${String(Object.keys(stores).length)} stores to ${result.filePath}`);

  return result.filePath;
}

// ─── Import ────────────────────────────────────────────────────

/**
 * Import data from a JSON archive, merging into existing stores.
 * Returns the number of stores successfully imported.
 */
export function importData(
  dataDir: string,
  filePath: string,
): { success: boolean; imported: number } {
  if (!existsSync(filePath)) {
    throw new Error(`Import file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const archive = JSON.parse(raw) as unknown;

  if (typeof archive !== 'object' || archive === null) {
    throw new Error('Invalid archive format: not an object');
  }

  const record = archive as Record<string, unknown>;

  if (record.version !== ARCHIVE_VERSION) {
    throw new Error(`Unsupported archive version: ${String(record.version)}`);
  }

  const { stores } = record;
  if (typeof stores !== 'object' || stores === null) {
    throw new Error('Invalid archive format: missing stores');
  }

  const storesRecord = stores as Record<string, unknown>;
  let imported = 0;

  // Build a lookup of allowed store IDs for validation
  const allowedStoreIds = new Set(
    DATA_STORE_REGISTRY.filter((s) => s.canExport && !s.sensitive && !s.isDirectory).map(
      (s) => s.id,
    ),
  );

  for (const [storeId, data] of Object.entries(storesRecord)) {
    if (!allowedStoreIds.has(storeId)) {
      logger.info(`Skipping unknown or restricted store: ${storeId}`);
      continue;
    }

    const store = DATA_STORE_REGISTRY.find((s) => s.id === storeId);
    if (store === undefined) {
      continue;
    }

    const targetPath = join(dataDir, store.filePath);

    try {
      // Ensure parent directory exists
      const parentDir = dirname(targetPath);
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }

      // Merge strategy: if both are arrays, concatenate. If both are objects
      // with a primary array key, concatenate the arrays. Otherwise, write new data.
      const existing = readJsonSafe(targetPath);
      const merged = mergeStoreData(existing, data);

      writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
      imported += 1;
      logger.info(`Imported store: ${storeId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to import store ${storeId}: ${message}`);
    }
  }

  logger.info(`Import complete: ${String(imported)} stores imported`);
  return { success: true, imported };
}

/**
 * Merge imported data with existing data.
 * - Both arrays: concatenate (imported appended)
 * - Both objects with matching array key: concatenate inner arrays
 * - Otherwise: use imported data
 */
/**
 * Concatenate two arrays safely without using spread on unknown[].
 */
function concatArrays(a: unknown[], b: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const item of a) {
    result.push(item);
  }
  for (const item of b) {
    result.push(item);
  }
  return result;
}

/**
 * Merge two record objects, concatenating array values for matching keys.
 */
function mergeRecords(
  existing: Record<string, unknown>,
  imported: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };

  for (const [key, value] of Object.entries(imported)) {
    const existingValue = existing[key];
    result[key] =
      Array.isArray(existingValue) && Array.isArray(value)
        ? concatArrays(existingValue as unknown[], value as unknown[])
        : value;
  }

  return result;
}

function mergeStoreData(existing: unknown, imported: unknown): unknown {
  // No existing data — use imported as-is
  if (existing === null || existing === undefined) {
    return imported;
  }

  // Both are arrays — concatenate
  if (Array.isArray(existing) && Array.isArray(imported)) {
    return concatArrays(existing as unknown[], imported as unknown[]);
  }

  // Both are non-array objects — merge records
  if (
    typeof existing === 'object' &&
    typeof imported === 'object' &&
    !Array.isArray(existing) &&
    !Array.isArray(imported) &&
    imported !== null
  ) {
    return mergeRecords(
      existing as Record<string, unknown>,
      imported as Record<string, unknown>,
    );
  }

  // Fallback: use imported data
  return imported;
}
