import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const peerState = sqliteTable('peer_state', {
  peerId: text('peer_id').primaryKey(),
  displayName: text('display_name'),
  pubkey: text('pubkey').notNull(),
  certFingerprint: text('cert_fingerprint').notNull(),
  lastSeenHlc: text('last_seen_hlc'),
  pairedAt: integer('paired_at').notNull(),
  lastConnectedAt: integer('last_connected_at'),
  revokedAt: integer('revoked_at'),
});

export type PeerStateRow = typeof peerState.$inferSelect;
