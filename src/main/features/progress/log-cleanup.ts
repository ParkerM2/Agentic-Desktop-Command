/**
 * Log Cleanup
 *
 * Utility that removes old JSONL session logs from progress directories
 * while preserving .summary.json files permanently. Only deletes a JSONL
 * file if a corresponding summary already exists (so the only record of a
 * session is never lost).
 *
 * Scan targets:
 *   progress/<slug>/sessions/<agent>.jsonl
 *   progress/archived/<slug>/sessions/<agent>.jsonl
 */

import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { serviceLogger } from '@main/lib/logger';

// ─── Helpers ─────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/**
 * Safely list directory entries. Returns an empty array when the
 * directory does not exist or is otherwise unreadable.
 */
async function safeReaddir(dirPath: string): Promise<string[]> {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
}

/**
 * Check whether a file exists by stat-ing it.
 * Returns `false` for any error (not found, permission, etc.).
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

// ─── Core Logic ──────────────────────────────────────────────

/**
 * Clean stale JSONL session logs from a single `sessions/` directory.
 *
 * For each `.jsonl` file that is older than `cutoffMs` and has a
 * matching `.summary.json` sibling, the JSONL is deleted.
 */
async function cleanSessionDir(
  sessionsDir: string,
  cutoffMs: number,
): Promise<number> {
  const entries = await safeReaddir(sessionsDir);
  let deleted = 0;

  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;

    const jsonlPath = join(sessionsDir, entry);

    // Check file age
    let mtimeMs: number;
    try {
      const s = await stat(jsonlPath);
      if (!s.isFile()) continue;
      ({ mtimeMs } = s);
    } catch {
      continue;
    }

    if (mtimeMs > cutoffMs) continue; // Too recent — keep it

    // Derive summary filename: e.g. "agent-name.jsonl" → "agent-name.summary.json"
    const baseName = entry.slice(0, -'.jsonl'.length);
    const summaryName = `${baseName}.summary.json`;
    const summaryPath = join(sessionsDir, summaryName);

    const hasSummary = await fileExists(summaryPath);
    if (!hasSummary) continue; // No summary — don't delete the only record

    try {
      await unlink(jsonlPath);
      deleted += 1;
    } catch (err: unknown) {
      serviceLogger.warn(
        `[LogCleanup] Failed to delete ${jsonlPath}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return deleted;
}

/**
 * Scan all task slugs in a given parent directory and clean their
 * `sessions/` subdirectories.
 */
async function cleanParentDir(
  parentDir: string,
  cutoffMs: number,
): Promise<number> {
  const slugs = await safeReaddir(parentDir);
  let total = 0;

  for (const slug of slugs) {
    const sessionsDir = join(parentDir, slug, 'sessions');
    total += await cleanSessionDir(sessionsDir, cutoffMs);
  }

  return total;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Delete JSONL session logs older than `maxAgeDays` days from the
 * progress directory, provided a `.summary.json` already exists for
 * each file.
 *
 * Scans both active and archived task directories for session logs.
 *
 * @param progressDir - Absolute path to the `progress/` directory.
 * @param maxAgeDays  - Maximum age in days before a JSONL is eligible
 *                      for deletion. Defaults to 7.
 * @returns The count of deleted files.
 */
export async function runLogCleanup(
  progressDir: string,
  maxAgeDays = 7,
): Promise<{ deletedFiles: number }> {
  const cutoffMs = Date.now() - maxAgeDays * MS_PER_DAY;

  const archivedDir = join(progressDir, 'archived');

  const [activeDeleted, archivedDeleted] = await Promise.all([
    cleanParentDir(progressDir, cutoffMs),
    cleanParentDir(archivedDir, cutoffMs),
  ]);

  const deletedFiles = activeDeleted + archivedDeleted;

  if (deletedFiles > 0) {
    serviceLogger.info(
      `[LogCleanup] Deleted ${String(deletedFiles)} stale JSONL log(s)`,
    );
  }

  return { deletedFiles };
}
