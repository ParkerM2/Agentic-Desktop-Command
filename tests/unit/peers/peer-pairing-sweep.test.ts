import { describe, expect, it } from 'vitest';

import { createPeerPairing } from '@main/features/peers/peer-pairing';

const initiator = {
  peerId: 'peer-A',
  pubkey: 'cHVia2V5',
  fingerprint: 'fp',
  displayName: 'Alice',
};

describe('createPeerPairing — session sweep + activeSessionCount', () => {
  it('exposes activeSessionCount() reflecting live sessions', () => {
    const t = 1_000_000;
    const pairing = createPeerPairing({ now: () => t, sessionTtlMs: 1000 });
    expect(pairing.activeSessionCount()).toBe(0);
    pairing.initPair({ ...initiator, peerId: 'p1' });
    pairing.initPair({ ...initiator, peerId: 'p2' });
    expect(pairing.activeSessionCount()).toBe(2);
  });

  it('sweeps expired sessions on initPair when TTL has passed', () => {
    let t = 1_000_000;
    const pairing = createPeerPairing({
      now: () => t,
      sessionTtlMs: 1000,
      maxActiveSessions: 10,
    });
    pairing.initPair({ ...initiator, peerId: 'p1' });
    pairing.initPair({ ...initiator, peerId: 'p2' });
    expect(pairing.activeSessionCount()).toBe(2);

    // advance past TTL — both existing sessions are expired
    t += 2000;
    pairing.initPair({ ...initiator, peerId: 'p3' });
    // expired sweep should have purged p1 + p2, leaving just p3
    expect(pairing.activeSessionCount()).toBe(1);
  });

  it('respects maxActiveSessions by sweeping expired entries before insert', () => {
    let t = 1_000_000;
    const pairing = createPeerPairing({
      now: () => t,
      sessionTtlMs: 1000,
      maxActiveSessions: 2,
    });
    pairing.initPair({ ...initiator, peerId: 'p1' });
    pairing.initPair({ ...initiator, peerId: 'p2' });
    expect(pairing.activeSessionCount()).toBe(2);

    // advance past TTL so existing entries are sweepable
    t += 2000;
    // inserting a new session should sweep the 2 expired ones first,
    // then store the new one — final count is 1, not 3.
    pairing.initPair({ ...initiator, peerId: 'p3' });
    expect(pairing.activeSessionCount()).toBe(1);
  });
});
