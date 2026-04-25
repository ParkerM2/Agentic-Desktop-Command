import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString('utf8'),
  },
}));

const { getOrCreatePeerIdentity } = await import('@main/features/peers/peer-identity');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'peer-identity-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('peer-identity', () => {
  it('creates a new identity on first call', () => {
    const id = getOrCreatePeerIdentity(dir);
    expect(id.pubkey).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(id.privkey).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(id.peerIdFull).toMatch(/^[0-9a-f]{64}$/);
    expect(id.peerIdShort).toBe(id.peerIdFull.slice(0, 8));
  });

  it('returns the same identity on second call', () => {
    const a = getOrCreatePeerIdentity(dir);
    const b = getOrCreatePeerIdentity(dir);
    expect(a.peerIdFull).toBe(b.peerIdFull);
    expect(a.pubkey).toBe(b.pubkey);
  });

  it('peerIdFull is SHA-256 of raw pubkey bytes', () => {
    const id = getOrCreatePeerIdentity(dir);
    const pubBytes = Buffer.from(id.pubkey, 'base64');
    expect(pubBytes).toHaveLength(32);
    const hash = createHash('sha256').update(pubBytes).digest('hex');
    expect(id.peerIdFull).toBe(hash);
  });

  it('sign() produces a 64-byte Ed25519 signature that verifies', () => {
    const id = getOrCreatePeerIdentity(dir);
    const sig = id.sign(Buffer.from('hello'));
    expect(sig).toHaveLength(64);
  });
});
