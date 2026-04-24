export interface Hlc {
  wallClockMs: number;
  counter: number;
  peerIdShort: string;
}

const WALL_PAD = 20;
const COUNTER_PAD = 4;

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
  return {
    wallClockMs: Number(parts[0]),
    counter: parseInt(parts[1], 16),
    peerIdShort: parts[2],
  };
}

export function compareHlc(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
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
