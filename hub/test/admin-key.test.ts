import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveAdminKey, rotateAdminKey } from '../src/lib/admin-key';

test('generates on first resolve and persists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-'));
  try {
    const k = resolveAdminKey(dir);
    assert.match(k, /^[0-9a-f]{64}$/);
    assert.ok(existsSync(join(dir, 'admin-key.txt')));
    assert.equal(readFileSync(join(dir, 'admin-key.txt'), 'utf8').trim(), k);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reuses existing key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-'));
  try {
    const a = resolveAdminKey(dir);
    const b = resolveAdminKey(dir);
    assert.equal(a, b);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rotate replaces the key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-'));
  try {
    const a = resolveAdminKey(dir);
    const b = rotateAdminKey(dir);
    assert.notEqual(b, a);
    assert.equal(resolveAdminKey(dir), b);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
