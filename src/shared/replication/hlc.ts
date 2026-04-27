export interface Hlc {
  wallClockMs: number;
  counter: number;
  peerIdShort: string;
}

// Wall-clock ms is at most 13 digits in JS (Date.now() through year 5138 fits in 13 digits;
// the prior value of 20 was both excessive and pushed the numeric portion past
// MAX_SAFE_INTEGER for round-trip via Number()). Audit reference: tmp/audit/03-replication.md C1.
const WALL_PAD = 13;
const COUNTER_PAD = 8;

export function formatHlc(hlc: Hlc): string {
  const wall = String(hlc.wallClockMs).padStart(WALL_PAD, '0');
  const counter = hlc.counter.toString(16).padStart(COUNTER_PAD, '0');
  return `${wall}.${counter}.${hlc.peerIdShort}`;
}

export function parseHlc(s: string): Hlc {
  const parts = s.split('.');
  if (parts.length !== 3) {
    throw new Error(`invalid HLC: ${s}`);
  }
  const wallClockMs = Number(parts[0]);
  const counter = parseInt(parts[1], 16);
  if (!Number.isFinite(wallClockMs) || !Number.isFinite(counter)) {
    throw new Error(`invalid HLC: ${s}`);
  }
  return { wallClockMs, counter, peerIdShort: parts[2] };
}

export function compareHlc(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Strip the trailing `.peerIdShort` suffix from an HLC string, returning the
 * `wall.counter` prefix. Used by GC frontier computation so that ops authored
 * by peers with lex-greater peer-id-shorts at the same wall+counter are not
 * incorrectly garbage-collected. Audit reference: tmp/audit/03-replication.md C4.
 */
export function hlcWallCounterPrefix(h: string): string {
  return h.replace(/\.[A-Za-z0-9]+$/, '');
}

export function nextHlc(args: {
  lastHlc: string | null;
  wallClockMs: number;
  peerIdShort: string;
}): string {
  const { lastHlc, wallClockMs, peerIdShort } = args;

  if (lastHlc === null) {
    return formatHlc({ wallClockMs, counter: 0, peerIdShort });
  }

  const last = parseHlc(lastHlc);

  if (wallClockMs > last.wallClockMs) {
    return formatHlc({ wallClockMs, counter: 0, peerIdShort });
  }

  // Clock did not advance (or went backward). Bump counter.
  return formatHlc({
    wallClockMs: last.wallClockMs,
    counter: last.counter + 1,
    peerIdShort,
  });
}

export function receiveHlc(local: string | null, incoming: string): string {
  if (local === null) return incoming;
  return compareHlc(local, incoming) >= 0 ? local : incoming;
}
