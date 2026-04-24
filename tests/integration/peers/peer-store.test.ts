import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@main/db/schema';
import { createPeerStore } from '@main/features/peers/peer-store';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let store: ReturnType<typeof createPeerStore>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  store = createPeerStore(db);
});

afterEach(() => sqlite.close());

const basePeer = {
  peerId: 'peer-a',
  displayName: 'Desktop A',
  pubkey: 'base64-pubkey',
  certFingerprint: 'a'.repeat(64),
  pairedAt: 1_000_000,
};

describe('peer-store', () => {
  it('upserts a new peer and reads it back', () => {
    store.upsert(basePeer);
    const got = store.getByPeerId('peer-a');
    expect(got).toMatchObject(basePeer);
    expect(got?.revokedAt).toBeNull();
  });

  it('upsert on existing peer updates fields', () => {
    store.upsert(basePeer);
    store.upsert({ ...basePeer, displayName: 'Renamed' });
    expect(store.getByPeerId('peer-a')?.displayName).toBe('Renamed');
    expect(store.listAll()).toHaveLength(1);
  });

  it('returns null for missing peer', () => {
    expect(store.getByPeerId('nope')).toBeNull();
  });

  it('listAll returns all peers including revoked', () => {
    store.upsert({ ...basePeer, peerId: 'peer-a' });
    store.upsert({ ...basePeer, peerId: 'peer-b' });
    store.revoke('peer-a', 2_000_000);
    expect(store.listAll()).toHaveLength(2);
  });

  it('listActive excludes revoked peers', () => {
    store.upsert({ ...basePeer, peerId: 'peer-a' });
    store.upsert({ ...basePeer, peerId: 'peer-b' });
    store.revoke('peer-a', 2_000_000);
    expect(store.listActive().map((p) => p.peerId)).toEqual(['peer-b']);
  });

  it('revoke sets revokedAt', () => {
    store.upsert(basePeer);
    store.revoke('peer-a', 2_500_000);
    expect(store.getByPeerId('peer-a')?.revokedAt).toBe(2_500_000);
  });

  it('updateLastSeenHlc writes hlc', () => {
    store.upsert(basePeer);
    store.updateLastSeenHlc('peer-a', '00000000000000000100.00000000.aaaaaaaa');
    expect(store.getByPeerId('peer-a')?.lastSeenHlc).toBe('00000000000000000100.00000000.aaaaaaaa');
  });

  it('updateLastConnectedAt writes timestamp', () => {
    store.upsert(basePeer);
    store.updateLastConnectedAt('peer-a', 3_000_000);
    expect(store.getByPeerId('peer-a')?.lastConnectedAt).toBe(3_000_000);
  });
});
