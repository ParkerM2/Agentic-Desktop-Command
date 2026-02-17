/**
 * Atomic JSON write utility
 *
 * Writes JSON data to a file atomically by writing to a temporary file first,
 * flushing to disk with fsyncSync, then renaming. If the rename fails, the
 * original file remains untouched.
 */

import { closeSync, fsyncSync, openSync, renameSync, writeSync } from 'node:fs';

/**
 * Write data as pretty-printed JSON to `filePath` atomically.
 *
 * 1. Serialize `data` to JSON
 * 2. Write to `<filePath>.tmp`
 * 3. fsyncSync to flush to disk
 * 4. Rename `.tmp` to target (atomic on all OSes)
 *
 * If rename fails, the original file is untouched.
 */
export function safeWriteJson(filePath: string, data: unknown): void {
  const tmpPath = `${filePath}.tmp`;
  const json = JSON.stringify(data, null, 2);

  const fd = openSync(tmpPath, 'w');
  try {
    writeSync(fd, json, null, 'utf-8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }

  renameSync(tmpPath, filePath);
}
