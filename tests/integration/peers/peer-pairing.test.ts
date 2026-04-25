import { beforeEach, describe, expect, it } from 'vitest';

import { createPeerPairing } from '@main/features/peers/peer-pairing';

const INIT = {
  peerId: 'a'.repeat(64),
  pubkey: 'base64-pubkey',
  displayName: 'Desktop A',
};

describe('peer-pairing', () => {
  let now: number;
  let pairing: ReturnType<typeof createPeerPairing>;

  beforeEach(() => {
    now = 1_000_000;
    pairing = createPeerPairing({
      now: () => now,
      sessionTtlMs: 300_000,
      maxAttempts: 3,
    });
  });

  it('initPair returns sessionId, 6-digit PIN, base64 challenge', () => {
    const r = pairing.initPair(INIT);
    expect(r.sessionId).toMatch(/^[0-9a-f-]+$/);
    expect(r.pin).toMatch(/^\d{6}$/);
    const challengeBytes = Buffer.from(r.challenge, 'base64');
    expect(challengeBytes).toHaveLength(32);
  });

  it('confirmPair with correct HMAC returns ok + initiator details', () => {
    const r = pairing.initPair(INIT);
    const hmac = pairing.computePinHmac(r.pin, r.challenge);
    const c = pairing.confirmPair(r.sessionId, hmac);
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.initiator.peerId).toBe(INIT.peerId);
      expect(c.initiator.pubkey).toBe(INIT.pubkey);
      expect(c.initiator.displayName).toBe(INIT.displayName);
    }
  });

  it('confirmPair consumes session — second call returns unknown_session', () => {
    const r = pairing.initPair(INIT);
    const hmac = pairing.computePinHmac(r.pin, r.challenge);
    const first = pairing.confirmPair(r.sessionId, hmac);
    expect(first.ok).toBe(true);
    const second = pairing.confirmPair(r.sessionId, hmac);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('unknown_session');
  });

  it('wrong PIN decrements attempts then locks out', () => {
    const r = pairing.initPair(INIT);
    const bad = pairing.computePinHmac('000000', r.challenge);

    let c = pairing.confirmPair(r.sessionId, bad);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('wrong_pin');

    c = pairing.confirmPair(r.sessionId, bad);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('wrong_pin');

    c = pairing.confirmPair(r.sessionId, bad);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('locked_out');

    // Any further attempt on the now-deleted session
    const c2 = pairing.confirmPair(r.sessionId, bad);
    expect(c2.ok).toBe(false);
    if (!c2.ok) expect(c2.reason).toBe('unknown_session');

    // Even the correct PIN can't revive a locked-out session
    const good = pairing.computePinHmac(r.pin, r.challenge);
    const c3 = pairing.confirmPair(r.sessionId, good);
    expect(c3.ok).toBe(false);
    if (!c3.ok) expect(c3.reason).toBe('unknown_session');
  });

  it('expired session returns expired', () => {
    const r = pairing.initPair(INIT);
    now += 300_001; // 1 ms past TTL
    const hmac = pairing.computePinHmac(r.pin, r.challenge);
    const c = pairing.confirmPair(r.sessionId, hmac);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('expired');
  });

  it('unknown session id returns unknown_session', () => {
    const c = pairing.confirmPair('nonexistent', 'whatever');
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('unknown_session');
  });

  it('computePinHmac is deterministic + differs per challenge', () => {
    const a = pairing.computePinHmac('123456', 'AAAA');
    const b = pairing.computePinHmac('123456', 'AAAA');
    const c = pairing.computePinHmac('123456', 'BBBB');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
