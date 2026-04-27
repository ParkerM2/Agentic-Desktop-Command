import { describe, expect, it } from 'vitest';

import { gcWatermarkFromObserved, type ObservedPeer } from '@main/features/peers/gc-watermark';

describe('gcWatermarkFromObserved', () => {
  it('returns null when no peers exist', () => {
    expect(gcWatermarkFromObserved([])).toBeNull();
  });

  it('returns null when no peers are active', () => {
    const peers: ObservedPeer[] = [
      { peerId: 'peer-a', revokedAt: 1_000, lastSeenHlc: '0000000099999.00000001.aaaaaaaa' },
    ];
    expect(gcWatermarkFromObserved(peers)).toBeNull();
  });

  it('returns null when at least one active peer is unseen', () => {
    const peers: ObservedPeer[] = [
      { peerId: 'peer-a', revokedAt: null, lastSeenHlc: '0000000099999.00000001.aaaaaaaa' },
      { peerId: 'peer-b', revokedAt: null, lastSeenHlc: null },
    ];
    expect(gcWatermarkFromObserved(peers)).toBeNull();
  });

  it('strips the peerIdShort suffix when computing the frontier', () => {
    // Two paired peers at the same wall.counter prefix but different
    // peer-id-shorts. The lex min over full strings would be the one with
    // the lex-smaller suffix, but callers compare `op_log.hlc < watermark`,
    // so we must return the prefix with no suffix to avoid deleting ops
    // authored by the lex-greater peer.
    const peers: ObservedPeer[] = [
      { peerId: 'peer-a', revokedAt: null, lastSeenHlc: '0000000099999.00000001.aaaaaaaa' },
      { peerId: 'peer-b', revokedAt: null, lastSeenHlc: '0000000099999.00000001.zzzzzzzz' },
    ];
    expect(gcWatermarkFromObserved(peers)).toBe('0000000099999.00000001');
  });

  it('returns lex-min of stripped prefixes across active peers', () => {
    const peers: ObservedPeer[] = [
      { peerId: 'peer-a', revokedAt: null, lastSeenHlc: '0000000200000.00000005.aaaaaaaa' },
      { peerId: 'peer-b', revokedAt: null, lastSeenHlc: '0000000099999.00000001.bbbbbbbb' },
      { peerId: 'peer-c', revokedAt: null, lastSeenHlc: '0000000300000.00000000.cccccccc' },
    ];
    expect(gcWatermarkFromObserved(peers)).toBe('0000000099999.00000001');
  });

  it('ignores revoked peers when computing the frontier', () => {
    // A revoked peer with a very low HLC must NOT pin the watermark.
    const peers: ObservedPeer[] = [
      { peerId: 'peer-revoked', revokedAt: 1_000, lastSeenHlc: '0000000000001.00000000.zzzzzzzz' },
      { peerId: 'peer-a', revokedAt: null, lastSeenHlc: '0000000099999.00000001.aaaaaaaa' },
    ];
    expect(gcWatermarkFromObserved(peers)).toBe('0000000099999.00000001');
  });
});
