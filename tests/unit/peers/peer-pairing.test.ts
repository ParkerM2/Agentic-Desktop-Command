import { describe, expect, it, vi } from 'vitest';

import { createPeerPairing } from '@main/features/peers/peer-pairing';

const initiator = {
  peerId: 'peer-A',
  pubkey: 'cHVia2V5',
  fingerprint: 'fp',
  displayName: 'Alice',
};

describe('createPeerPairing — default pinRng', () => {
  it('produces 6-digit numeric PINs', () => {
    const pairing = createPeerPairing();
    for (let i = 0; i < 50; i++) {
      const { pin } = pairing.initPair({ ...initiator, peerId: `peer-${i}` });
      expect(pin).toMatch(/^\d{6}$/);
    }
  });

  it('produces a roughly uniform distribution (>150 distinct in 200 draws)', () => {
    const pairing = createPeerPairing();
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { pin } = pairing.initPair({ ...initiator, peerId: `peer-${i}` });
      seen.add(pin);
    }
    expect(seen.size).toBeGreaterThan(150);
  });

  it('does not call Math.random for default PIN generation', () => {
    const spy = vi.spyOn(Math, 'random');
    const pairing = createPeerPairing();
    pairing.initPair(initiator);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('createPeerPairing — confirmPair length-mismatch safety', () => {
  it('returns wrong_pin (does not throw) when pinHmac decodes to a shorter buffer than expectedHmac', () => {
    const pairing = createPeerPairing();
    const { sessionId } = pairing.initPair(initiator);

    // base64 of a 1-byte buffer — clearly shorter than a 32-byte sha256 HMAC
    const shortHmac = Buffer.from([0x00]).toString('base64');

    expect(() => pairing.confirmPair(sessionId, shortHmac)).not.toThrow();
    const result = pairing.confirmPair(sessionId, shortHmac);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // length mismatch should be treated as a wrong pin, not a crash
      expect(['wrong_pin', 'locked_out']).toContain(result.reason);
    }
  });

  it('returns ok:true when correct HMAC is supplied', () => {
    const pairing = createPeerPairing();
    const { sessionId, pin, challenge } = pairing.initPair(initiator);
    const hmac = pairing.computePinHmac(pin, challenge);
    const result = pairing.confirmPair(sessionId, hmac);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.initiator.peerId).toBe(initiator.peerId);
    }
  });

  it('does not throw on garbage (non-base64) input', () => {
    const pairing = createPeerPairing();
    const { sessionId } = pairing.initPair(initiator);
    expect(() => pairing.confirmPair(sessionId, '!!!not-base64!!!')).not.toThrow();
  });
});

describe('PairConfirmResult — never returns plaintext PIN', () => {
  it('success result has only ok + initiator (no pin field)', () => {
    const pairing = createPeerPairing();
    const { sessionId, pin, challenge } = pairing.initPair(initiator);
    const hmac = pairing.computePinHmac(pin, challenge);
    const result = pairing.confirmPair(sessionId, hmac);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain(pin);
    expect((result as Record<string, unknown>).pin).toBeUndefined();
  });

  it('failure result does not leak the plaintext PIN', () => {
    const pairing = createPeerPairing();
    const { sessionId, pin } = pairing.initPair(initiator);
    const result = pairing.confirmPair(sessionId, 'AAAA');
    expect(JSON.stringify(result)).not.toContain(pin);
    expect((result as Record<string, unknown>).pin).toBeUndefined();
  });
});
