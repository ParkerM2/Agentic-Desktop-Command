import { describe, expect, it } from 'vitest';

import { pinnedCheckServerIdentity } from '@main/features/peers/peer-tls-pin';

import type { PeerCertificate } from 'node:tls';

// sha256 hex of Buffer.from('hello')
const HELLO_SHA256_HEX = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

function makeCert(raw: Buffer | undefined): PeerCertificate {
  // Cast through unknown — only `raw` is consumed by the helper.
  return { raw } as unknown as PeerCertificate;
}

describe('pinnedCheckServerIdentity', () => {
  it('returns a function', () => {
    const check = pinnedCheckServerIdentity(HELLO_SHA256_HEX);
    expect(typeof check).toBe('function');
  });

  it('returns undefined when fingerprint matches', () => {
    const check = pinnedCheckServerIdentity(HELLO_SHA256_HEX);
    const result = check('example.local', makeCert(Buffer.from('hello')));
    expect(result).toBeUndefined();
  });

  it('returns an Error when fingerprint mismatches', () => {
    const check = pinnedCheckServerIdentity(HELLO_SHA256_HEX);
    const result = check('example.local', makeCert(Buffer.from('goodbye')));
    expect(result).toBeInstanceOf(Error);
    expect(result!.message).toContain('fingerprint mismatch');
  });

  it('returns an Error when cert lacks raw', () => {
    const check = pinnedCheckServerIdentity(HELLO_SHA256_HEX);
    // Construct a cert object with no `raw` field at all.
    const certNoRaw = {} as unknown as PeerCertificate;
    const result = check('example.local', certNoRaw);
    expect(result).toBeInstanceOf(Error);
    expect(result!.message).toContain('fingerprint mismatch');
  });

  it('returns an Error when cert.raw is empty', () => {
    const check = pinnedCheckServerIdentity(HELLO_SHA256_HEX);
    const result = check('example.local', makeCert(Buffer.alloc(0)));
    expect(result).toBeInstanceOf(Error);
    expect(result!.message).toContain('fingerprint mismatch');
  });

  it('returns an Error when expected hex differs in length from sha256', () => {
    const check = pinnedCheckServerIdentity('deadbeef');
    const result = check('example.local', makeCert(Buffer.from('hello')));
    expect(result).toBeInstanceOf(Error);
    expect(result!.message).toContain('fingerprint mismatch');
  });
});
