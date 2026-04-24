import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { resolveTls } from '../src/lib/tls';

test('resolveTls generates cert, key, and fingerprint on first call', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tls-'));
  try {
    const r = await resolveTls(dir, 'test-hub-id');
    assert.match(r.cert, /BEGIN CERTIFICATE/);
    assert.match(r.key, /BEGIN PRIVATE KEY/);
    assert.match(r.fingerprint, /^[0-9a-f]{64}$/);
    assert.ok(existsSync(join(dir, 'tls.cert.pem')));
    assert.ok(existsSync(join(dir, 'tls.key.pem')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reuses existing cert on subsequent calls', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tls-'));
  try {
    const a = await resolveTls(dir, 'test-hub-id');
    const b = await resolveTls(dir, 'test-hub-id');
    assert.equal(a.fingerprint, b.fingerprint);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fingerprint matches SHA-256 of DER cert', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tls-'));
  try {
    const r = await resolveTls(dir, 'test-hub-id');
    const der = Buffer.from(
      r.cert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, ''),
      'base64',
    );
    const expected = createHash('sha256').update(der).digest('hex');
    assert.equal(r.fingerprint, expected);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regenerates when cert expires within 30 days', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tls-'));
  try {
    const a = await resolveTls(dir, 'test-hub-id', {
      notAfter: new Date(Date.now() + 10 * 86_400_000),
    });
    const b = await resolveTls(dir, 'test-hub-id');
    assert.notEqual(b.fingerprint, a.fingerprint);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
