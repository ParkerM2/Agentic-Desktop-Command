import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolvePeerTls, computeCertFingerprint } from '@main/features/peers/peer-tls';

let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'peer-tls-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('peer-tls', () => {
  it('creates cert + key on first call', async () => {
    const mat = await resolvePeerTls(dir, 'peer-a');
    expect(mat.cert).toMatch(/^-----BEGIN CERTIFICATE-----/);
    expect(mat.key).toMatch(/^-----BEGIN PRIVATE KEY-----/);
    expect(mat.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(join(dir, 'peer-tls.cert.pem'))).toBe(true);
    expect(existsSync(join(dir, 'peer-tls.key.pem'))).toBe(true);
  });

  it('returns the same material on second call (idempotent)', async () => {
    const a = await resolvePeerTls(dir, 'peer-a');
    const b = await resolvePeerTls(dir, 'peer-a');
    expect(a.cert).toBe(b.cert);
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('computeCertFingerprint matches what resolvePeerTls returns', async () => {
    const mat = await resolvePeerTls(dir, 'peer-a');
    expect(computeCertFingerprint(mat.cert)).toBe(mat.fingerprint);
  });
});
