import { describe, expect, it } from 'vitest';

import {
  formatHlc,
  hlcWallCounterPrefix,
  parseHlc,
  type Hlc,
} from '@shared/replication/hlc';

const PEER_A = 'aaaaaaaa';

describe('hlc — WALL_PAD = 13 invariant', () => {
  it('round-trips parseHlc(formatHlc(x)) for Date.now()', () => {
    const wall = Date.now();
    const h: Hlc = { wallClockMs: wall, counter: 7, peerIdShort: PEER_A };
    expect(parseHlc(formatHlc(h))).toEqual(h);
  });

  it('round-trips parseHlc(formatHlc(x)) for wallClockMs = 0', () => {
    const h: Hlc = { wallClockMs: 0, counter: 0, peerIdShort: PEER_A };
    expect(parseHlc(formatHlc(h))).toEqual(h);
  });

  it('produces a wall segment exactly 13 chars wide', () => {
    const s = formatHlc({ wallClockMs: 0, counter: 0, peerIdShort: PEER_A });
    const parts = s.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(13);
    expect(parts[0]).toBe('0000000000000');
  });

  it('produces a wall segment exactly 13 chars wide for Date.now()', () => {
    const s = formatHlc({ wallClockMs: Date.now(), counter: 0, peerIdShort: PEER_A });
    expect(s.split('.')[0]).toHaveLength(13);
  });
});

describe('hlcWallCounterPrefix', () => {
  it('strips the trailing peerIdShort segment', () => {
    expect(hlcWallCounterPrefix('1234567890123.00000001.aaaaaaaa')).toBe(
      '1234567890123.00000001',
    );
  });

  it('handles mixed-case peerIdShort suffixes', () => {
    expect(hlcWallCounterPrefix('1234567890123.00000001.AbCdEf01')).toBe(
      '1234567890123.00000001',
    );
  });

  it('is idempotent over already-stripped values is not — second call would strip counter, so callers must apply once only', () => {
    // Document the contract: helper trims a single trailing alnum segment.
    // Callers that already hold a wall.counter prefix must NOT call this again.
    const once = hlcWallCounterPrefix('0000000099999.00000000.bbbbbbbb');
    expect(once).toBe('0000000099999.00000000');
  });
});
