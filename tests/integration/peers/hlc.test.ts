import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  compareHlc,
  formatHlc,
  nextHlc,
  parseHlc,
  receiveHlc,
  type Hlc,
} from '@shared/replication/hlc';

const PEER_A = 'aaaaaaaa';
const PEER_B = 'bbbbbbbb';

describe('formatHlc / parseHlc', () => {
  it('round-trips', () => {
    const h: Hlc = { wallClockMs: 1713955200000, counter: 42, peerIdShort: PEER_A };
    expect(parseHlc(formatHlc(h))).toEqual(h);
  });

  it('pads counter to 8 hex digits', () => {
    const s = formatHlc({ wallClockMs: 100, counter: 3, peerIdShort: PEER_A });
    expect(s).toBe('00000000000000000100.00000003.aaaaaaaa');
  });

  it('pads wallClockMs to 20 digits for lexicographic sort', () => {
    const s = formatHlc({ wallClockMs: 1, counter: 0, peerIdShort: PEER_A });
    expect(s.startsWith('00000000000000000001')).toBe(true);
  });

  it('handles large counters without changing width', () => {
    const s = formatHlc({ wallClockMs: 100, counter: 0xFFFFFF, peerIdShort: 'aaaaaaaa' });
    const parts = s.split('.');
    expect(parts[1]).toHaveLength(8);
    expect(parseInt(parts[1], 16)).toBe(0xFFFFFF);
  });

  it('throws on non-numeric parts', () => {
    expect(() => parseHlc('abc.0000.aaaaaaaa')).toThrow(/invalid HLC/);
    expect(() => parseHlc('100.zz.aaaaaaaa')).toThrow(/invalid HLC/);
  });
});

describe('compareHlc', () => {
  it('orders by wallClockMs first', () => {
    const earlier = formatHlc({ wallClockMs: 100, counter: 999, peerIdShort: PEER_B });
    const later = formatHlc({ wallClockMs: 101, counter: 0, peerIdShort: PEER_A });
    expect(compareHlc(earlier, later)).toBeLessThan(0);
  });

  it('breaks ties by counter', () => {
    const a = formatHlc({ wallClockMs: 100, counter: 1, peerIdShort: PEER_B });
    const b = formatHlc({ wallClockMs: 100, counter: 2, peerIdShort: PEER_A });
    expect(compareHlc(a, b)).toBeLessThan(0);
  });

  it('breaks counter ties by peerIdShort', () => {
    const a = formatHlc({ wallClockMs: 100, counter: 1, peerIdShort: PEER_A });
    const b = formatHlc({ wallClockMs: 100, counter: 1, peerIdShort: PEER_B });
    expect(compareHlc(a, b)).toBeLessThan(0);
  });

  it('is a total order (property)', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.nat(1e12), fc.nat(100), fc.constantFrom(PEER_A, PEER_B)),
        fc.tuple(fc.nat(1e12), fc.nat(100), fc.constantFrom(PEER_A, PEER_B)),
        (ha, hb) => {
          const a = formatHlc({ wallClockMs: ha[0], counter: ha[1], peerIdShort: ha[2] });
          const b = formatHlc({ wallClockMs: hb[0], counter: hb[1], peerIdShort: hb[2] });
          const cmp = compareHlc(a, b);
          if (cmp === 0) return a === b;
          if (cmp < 0) return compareHlc(b, a) > 0;
          return compareHlc(b, a) < 0;
        },
      ),
    );
  });
});

describe('nextHlc', () => {
  it('uses wallClock if greater than lastHlc', () => {
    const last = formatHlc({ wallClockMs: 100, counter: 5, peerIdShort: PEER_A });
    const next = nextHlc({ lastHlc: last, wallClockMs: 200, peerIdShort: PEER_A });
    expect(parseHlc(next)).toEqual({ wallClockMs: 200, counter: 0, peerIdShort: PEER_A });
  });

  it('increments counter if wallClock has not advanced', () => {
    const last = formatHlc({ wallClockMs: 100, counter: 5, peerIdShort: PEER_A });
    const next = nextHlc({ lastHlc: last, wallClockMs: 100, peerIdShort: PEER_A });
    expect(parseHlc(next)).toEqual({ wallClockMs: 100, counter: 6, peerIdShort: PEER_A });
  });

  it('increments counter if wallClock moves backward (clock skew)', () => {
    const last = formatHlc({ wallClockMs: 100, counter: 5, peerIdShort: PEER_A });
    const next = nextHlc({ lastHlc: last, wallClockMs: 50, peerIdShort: PEER_A });
    expect(parseHlc(next)).toEqual({ wallClockMs: 100, counter: 6, peerIdShort: PEER_A });
  });

  it('produces strictly increasing HLCs across constant wallClock', () => {
    let last = formatHlc({ wallClockMs: 100, counter: 0, peerIdShort: PEER_A });
    for (let i = 0; i < 1000; i++) {
      const next = nextHlc({ lastHlc: last, wallClockMs: 100, peerIdShort: PEER_A });
      expect(compareHlc(next, last)).toBeGreaterThan(0);
      last = next;
    }
  });

  it('produces strictly increasing HLCs across advancing and retreating wallClock', () => {
    const pattern = [100, 101, 101, 100, 50, 102, 102, 200, 199, 1000];
    let last: string | null = null;
    for (let i = 0; i < 200; i++) {
      const wallClockMs = pattern[i % pattern.length];
      const next = nextHlc({ lastHlc: last, wallClockMs, peerIdShort: PEER_A });
      if (last !== null) {
        expect(compareHlc(next, last)).toBeGreaterThan(0);
      }
      last = next;
    }
  });
});

describe('receiveHlc', () => {
  it('advances lastHlc to max(lastHlc, incoming)', () => {
    const local = formatHlc({ wallClockMs: 100, counter: 5, peerIdShort: PEER_A });
    const remote = formatHlc({ wallClockMs: 200, counter: 0, peerIdShort: PEER_B });
    expect(receiveHlc(local, remote)).toBe(remote);
  });

  it('keeps local if local is higher', () => {
    const local = formatHlc({ wallClockMs: 300, counter: 0, peerIdShort: PEER_A });
    const remote = formatHlc({ wallClockMs: 200, counter: 0, peerIdShort: PEER_B });
    expect(receiveHlc(local, remote)).toBe(local);
  });
});
