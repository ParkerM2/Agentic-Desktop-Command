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

describe('peer-store revokedAt reset on re-pair', () => {
  it('clears revokedAt when re-pairing a previously-revoked peer', () => {
    store.upsert(basePeer);
    store.revoke('peer-a', 2_500_000);
    expect(store.getByPeerId('peer-a')?.revokedAt).toBe(2_500_000);

    // Re-pair: caller does not pass revokedAt, so it should be cleared.
    store.upsert({ ...basePeer, pairedAt: 3_000_000 });

    const peer = store.getByPeerId('peer-a');
    expect(peer?.revokedAt).toBeNull();

    const active = store.listActive().map((p) => p.peerId);
    expect(active).toContain('peer-a');
  });

  it('preserves revokedAt when explicitly passed in upsert', () => {
    store.upsert(basePeer);
    store.upsert({ ...basePeer, revokedAt: 4_000_000 });
    expect(store.getByPeerId('peer-a')?.revokedAt).toBe(4_000_000);
  });
});
