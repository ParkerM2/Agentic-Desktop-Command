import { hlcWallCounterPrefix } from '@shared/replication/hlc';

/**
 * Per-peer observation row used to compute the GC watermark.
 */
export interface ObservedPeer {
  peerId: string;
  revokedAt: number | null;
  lastSeenHlc: string | null;
}

/**
 * Compute the op-log GC watermark from per-peer observations.
 *
 * Returns the lex-min `wall.counter` prefix across all *active* (non-revoked)
 * peers, or `null` if any active peer has never been seen (in which case GC
 * is unsafe — a still-pending peer might miss ops we delete).
 *
 * The peerIdShort suffix is stripped before comparing because two peers at the
 * same wall+counter but different shorts would otherwise yield different
 * mins, and the resulting GC `DELETE FROM op_log WHERE hlc < watermark` would
 * delete ops authored by peers whose suffix is lex-greater than the watermark
 * suffix — those ops are not yet known to that peer.
 *
 * Audit reference: tmp/audit/03-replication.md C4 + C5.
 */
export function gcWatermarkFromObserved(
  observed: readonly ObservedPeer[],
): string | null {
  const active = observed.filter((p) => p.revokedAt === null);
  if (active.length === 0) return null;
  const seen: string[] = [];
  for (const p of active) {
    if (p.lastSeenHlc === null) {
      // At least one active peer has never been seen — refuse to GC.
      return null;
    }
    seen.push(hlcWallCounterPrefix(p.lastSeenHlc));
  }
  return seen.reduce((min, h) => (h < min ? h : min));
}
