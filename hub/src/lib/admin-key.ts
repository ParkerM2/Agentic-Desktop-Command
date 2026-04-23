import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

function newKey(): string {
  return randomBytes(32).toString('hex');
}

function write(path: string, key: string): void {
  writeFileSync(path, `${key}\n`, { mode: 0o600 });
  if (process.platform !== 'win32') chmodSync(path, 0o600);
}

/**
 * Resolve the admin key for the given data directory.
 *
 * On first call, generates a 256-bit hex key and persists it to
 * `${dataDir}/admin-key.txt` with mode 0600. Subsequent calls return the
 * persisted key unchanged.
 */
export function resolveAdminKey(dataDir: string): string {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, 'admin-key.txt');
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf8').trim();
    if (existing.length > 0) return existing;
  }
  const k = newKey();
  write(path, k);
  return k;
}

/**
 * Rotate the admin key. Generates a new key, overwrites the persisted file,
 * and returns the new key.
 */
export function rotateAdminKey(dataDir: string): string {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, 'admin-key.txt');
  const k = newKey();
  write(path, k);
  return k;
}
