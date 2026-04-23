import { verify, createPublicKey, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';


import { ensureClientIdentity } from '@main/features/hub/client-identity';

// simple reversible fake encryption — NOT secure, just tests that encrypt/decrypt round-trip
const fakeVault = {
  encryptString: (s: string) => Buffer.from(`FAKE:${  s}`, 'utf8'),
  decryptString: (b: Buffer) => {
    const s = b.toString('utf8');
    if (!s.startsWith('FAKE:')) throw new Error('bad ciphertext');
    return s.slice(5);
  },
  isEncryptionAvailable: () => true,
};

describe('ensureClientIdentity', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'ci-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('generates keypair on first call; writes encrypted priv + public der', () => {
    const id = ensureClientIdentity(dir, { vault: fakeVault });
    expect(id.clientId).toMatch(/^[0-9a-f]{32}$/);
    expect(existsSync(join(dir, 'client-identity.enc'))).toBe(true);
    expect(existsSync(join(dir, 'client-identity.pub'))).toBe(true);
    // Encrypted file should not contain obvious plaintext PEM markers
    const encContents = readFileSync(join(dir, 'client-identity.enc'), 'utf8');
    expect(encContents.startsWith('FAKE:')).toBe(true);
  });

  it('second call returns same identity without regenerating', () => {
    const a = ensureClientIdentity(dir, { vault: fakeVault });
    const b = ensureClientIdentity(dir, { vault: fakeVault });
    expect(b.clientId).toBe(a.clientId);
    expect(Buffer.compare(b.publicKeyDer, a.publicKeyDer)).toBe(0);
  });

  it('signNonce produces a signature verifiable with the public key', () => {
    const id = ensureClientIdentity(dir, { vault: fakeVault });
    const nonce = randomBytes(32);
    const sig = id.signNonce(nonce);
    const pub = createPublicKey({ key: id.publicKeyDer, format: 'der', type: 'spki' });
    expect(verify(null, nonce, pub, sig)).toBe(true);
    // tampered nonce fails
    expect(verify(null, Buffer.concat([nonce, Buffer.from([1])]), pub, sig)).toBe(false);
  });

  it('publicKeyBase64url roundtrips to the DER bytes', () => {
    const id = ensureClientIdentity(dir, { vault: fakeVault });
    expect(Buffer.from(id.publicKeyBase64url, 'base64url').equals(id.publicKeyDer)).toBe(true);
  });

  it('different hubDir produces independent identity', () => {
    const a = ensureClientIdentity(dir, { vault: fakeVault });
    const otherDir = mkdtempSync(join(tmpdir(), 'ci2-'));
    try {
      const b = ensureClientIdentity(otherDir, { vault: fakeVault });
      expect(b.clientId).not.toBe(a.clientId);
    } finally {
      rmSync(otherDir, { recursive: true, force: true });
    }
  });
});
