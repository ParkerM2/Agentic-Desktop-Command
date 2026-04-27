import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeStorage } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrCreatePeerIdentity } from '@main/features/peers/peer-identity';

const mockedSafeStorage = vi.mocked(safeStorage);
function setEncryptionAvailable(value: boolean): void {
  mockedSafeStorage.isEncryptionAvailable.mockReturnValue(value);
}

describe('getOrCreatePeerIdentity — safeStorage unavailable', () => {
  let tmpDir: string;
  let savedEnv: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pid-'));
    setEncryptionAvailable(false);
    // Isolate from CI's ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY=1
    savedEnv = process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY;
    delete process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY;
  });

  afterEach(() => {
    setEncryptionAvailable(true);
    if (savedEnv !== undefined) {
      process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY = savedEnv;
    }
  });

  it('throws when safeStorage is unavailable and allowPlaintext is not set', () => {
    expect(() => getOrCreatePeerIdentity(tmpDir)).toThrowError(/safeStorage/);
  });

  it('throws when safeStorage is unavailable and allowPlaintext is explicitly false', () => {
    expect(() => getOrCreatePeerIdentity(tmpDir, { allowPlaintext: false })).toThrowError(
      /safeStorage/,
    );
  });

  it('does not write the identity file when refusing to write plaintext', () => {
    expect(() => getOrCreatePeerIdentity(tmpDir)).toThrow();
    expect(existsSync(join(tmpDir, 'peer-identity.json'))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')(
    'writes file with mode 0o600 when allowPlaintext is true',
    () => {
      const identity = getOrCreatePeerIdentity(tmpDir, { allowPlaintext: true });
      expect(identity.peerIdFull).toMatch(/^[0-9a-f]{64}$/);
      const path = join(tmpDir, 'peer-identity.json');
      expect(existsSync(path)).toBe(true);
      const mode = statSync(path).mode & 0o777;
      expect(mode).toBe(0o600);
    },
  );

  it('persists plaintext file with allowPlaintext true and reloads cleanly', () => {
    const a = getOrCreatePeerIdentity(tmpDir, { allowPlaintext: true });
    const b = getOrCreatePeerIdentity(tmpDir, { allowPlaintext: true });
    expect(b.peerIdFull).toBe(a.peerIdFull);
    expect(b.pubkey).toBe(a.pubkey);
    // Stored file format unchanged: still has pubkey, privkey, useSafeStorage keys
    const raw = JSON.parse(readFileSync(join(tmpDir, 'peer-identity.json'), 'utf8')) as {
      pubkey: string;
      privkey: string;
      useSafeStorage: boolean;
    };
    expect(raw.useSafeStorage).toBe(false);
    expect(typeof raw.pubkey).toBe('string');
    expect(typeof raw.privkey).toBe('string');
  });
});

describe('getOrCreatePeerIdentity — safeStorage available', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pid-'));
    setEncryptionAvailable(true);
  });

  it('returns an identity with peerIdFull, peerIdShort, pubkey, sign and no privkey', () => {
    const identity = getOrCreatePeerIdentity(tmpDir);
    expect(identity.peerIdFull).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.peerIdShort).toBe(identity.peerIdFull.slice(0, 8));
    expect(typeof identity.pubkey).toBe('string');
    expect(typeof identity.sign).toBe('function');
    expect('privkey' in identity).toBe(false);
  });

  it('signs a message and returns a Uint8Array of length 64 (Ed25519 sig)', () => {
    const identity = getOrCreatePeerIdentity(tmpDir);
    const sig = identity.sign(new TextEncoder().encode('hello'));
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBe(64);
  });

  it('reload yields the same peerIdFull and pubkey', () => {
    const a = getOrCreatePeerIdentity(tmpDir);
    const b = getOrCreatePeerIdentity(tmpDir);
    expect(b.peerIdFull).toBe(a.peerIdFull);
    expect(b.pubkey).toBe(a.pubkey);
  });
});
