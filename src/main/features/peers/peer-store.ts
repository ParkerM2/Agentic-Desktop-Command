import { eq, isNull, sql } from 'drizzle-orm';

import type { PairedPeer } from '@shared/ipc/peers';

import type { AdcDatabase } from '@main/db';

import { peerState } from './peer-state-schema';

export type { PairedPeer };

type UpsertInput = Pick<PairedPeer, 'peerId' | 'pubkey' | 'certFingerprint' | 'pairedAt'> & {
  displayName?: string | null;
  lastSeenHlc?: string | null;
  lastConnectedAt?: number | null;
  revokedAt?: number | null;
};

export interface PeerStore {
  upsert: (entry: UpsertInput) => void;
  getByPeerId: (peerId: string) => PairedPeer | null;
  listAll: () => PairedPeer[];
  listActive: () => PairedPeer[];
  revoke: (peerId: string, atMs: number) => void;
  updateLastSeenHlc: (peerId: string, hlc: string) => void;
  updateLastConnectedAt: (peerId: string, atMs: number) => void;
  /**
   * Atomically advance `last_seen_hlc` for a peer to `max(current, hlc)` and
   * stamp `last_connected_at` to now. Used by the replication engine on every
   * applied remote op so the GC watermark has accurate per-peer frontiers.
   * Audit reference: tmp/audit/03-replication.md C5.
   *
   * Note: peer_state rows only exist for paired peers. If the row does not yet
   * exist (e.g., op arrives before pairing completes), this is a no-op.
   */
  recordObserved: (peerId: string, hlc: string) => void;
}

function rowToPeer(r: typeof peerState.$inferSelect): PairedPeer {
  return {
    peerId: r.peerId,
    displayName: r.displayName,
    pubkey: r.pubkey,
    certFingerprint: r.certFingerprint,
    lastSeenHlc: r.lastSeenHlc,
    pairedAt: r.pairedAt,
    lastConnectedAt: r.lastConnectedAt,
    revokedAt: r.revokedAt,
  };
}

export function createPeerStore(db: AdcDatabase): PeerStore {
  return {
    upsert(entry) {
      db.insert(peerState)
        .values({
          peerId: entry.peerId,
          displayName: entry.displayName ?? null,
          pubkey: entry.pubkey,
          certFingerprint: entry.certFingerprint,
          lastSeenHlc: entry.lastSeenHlc ?? null,
          pairedAt: entry.pairedAt,
          lastConnectedAt: entry.lastConnectedAt ?? null,
          revokedAt: entry.revokedAt ?? null,
        })
        .onConflictDoUpdate({
          target: peerState.peerId,
          set: {
            displayName: entry.displayName ?? null,
            pubkey: entry.pubkey,
            certFingerprint: entry.certFingerprint,
          },
        })
        .run();
    },

    getByPeerId(peerId) {
      const row = db
        .select()
        .from(peerState)
        .where(eq(peerState.peerId, peerId))
        .get();
      return row ? rowToPeer(row) : null;
    },

    listAll() {
      return db.select().from(peerState).all().map(rowToPeer);
    },

    listActive() {
      return db
        .select()
        .from(peerState)
        .where(isNull(peerState.revokedAt))
        .all()
        .map(rowToPeer);
    },

    revoke(peerId, atMs) {
      db.update(peerState)
        .set({ revokedAt: atMs })
        .where(eq(peerState.peerId, peerId))
        .run();
    },

    updateLastSeenHlc(peerId, hlc) {
      db.update(peerState)
        .set({ lastSeenHlc: hlc })
        .where(eq(peerState.peerId, peerId))
        .run();
    },

    updateLastConnectedAt(peerId, atMs) {
      db.update(peerState)
        .set({ lastConnectedAt: atMs })
        .where(eq(peerState.peerId, peerId))
        .run();
    },

    recordObserved(peerId, hlc) {
      // UPDATE-only: peer_state rows have NOT NULL pubkey/certFingerprint/pairedAt
      // that can only come from the pairing handshake, so we cannot insert a
      // fresh row here. Ops arriving before pairing completes are silently
      // dropped on the floor for watermark purposes — pairing always runs
      // before replication begins, so this is sound.
      db.update(peerState)
        .set({
          lastSeenHlc: sql`CASE WHEN ${peerState.lastSeenHlc} IS NULL OR ${hlc} > ${peerState.lastSeenHlc} THEN ${hlc} ELSE ${peerState.lastSeenHlc} END`,
          lastConnectedAt: sql`${Date.now()}`,
        })
        .where(eq(peerState.peerId, peerId))
        .run();
    },
  };
}
