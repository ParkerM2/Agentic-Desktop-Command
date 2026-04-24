import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
});

afterEach(() => sqlite.close());

describe('peer_state migration', () => {
  it('creates the peer_state table with expected columns', () => {
    const cols = sqlite
      .prepare(`PRAGMA table_info(peer_state)`)
      .all() as Array<{ name: string; pk: number; notnull: number }>;
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      ['cert_fingerprint', 'display_name', 'last_connected_at', 'last_seen_hlc', 'paired_at', 'peer_id', 'pubkey', 'revoked_at'].sort(),
    );
    const pk = cols.find((c) => c.name === 'peer_id');
    expect(pk?.pk).toBe(1);
  });

  it('NOT NULL on pubkey, cert_fingerprint, paired_at', () => {
    expect(() =>
      sqlite
        .prepare(`INSERT INTO peer_state (peer_id) VALUES (?)`)
        .run('peer-a'),
    ).toThrow(/NOT NULL/);
  });
});
