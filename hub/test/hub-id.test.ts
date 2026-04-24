import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveHubId } from '../src/lib/hub-id';

test('resolveHubId generates and persists a UUID on first call', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hub-id-'));
  try {
    const id = resolveHubId(dir);
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(existsSync(join(dir, 'hub-id')));
    assert.equal(readFileSync(join(dir, 'hub-id'), 'utf8').trim(), id);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveHubId returns the same id on subsequent calls', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hub-id-'));
  try {
    const a = resolveHubId(dir);
    const b = resolveHubId(dir);
    assert.equal(a, b);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
