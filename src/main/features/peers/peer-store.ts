import { eq, isNull } from 'drizzle-orm';

import type { AdcDatabase } from '@main/db';

import { peerState } from './peer-state-schema';

export interface PairedPeer {
  peerId: string;
  displayName: string | null;
  pubkey: string;
  certFingerprint: string;
  lastSeenHlc: string | null;
  pairedAt: number;
  lastConnectedAt: number | null;
  revokedAt: number | null;
}

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
  };
}
