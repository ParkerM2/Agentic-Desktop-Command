import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
});

afterEach(() => sqlite.close());

describe('peers schema migration', () => {
  it('creates op_log table', () => {
    const rows = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='op_log'")
      .all();
    expect(rows).toHaveLength(1);
  });

  it('creates row_meta table', () => {
    const rows = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='row_meta'")
      .all();
    expect(rows).toHaveLength(1);
  });

  it('op_log has unique index on (origin_peer_id, hlc)', () => {
    sqlite
      .prepare(
        `INSERT INTO op_log (hlc, origin_peer_id, table_name, pk, op_type, payload, applied_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        '00000000000000000001.00000000.aaaaaaaa',
        'peer-a',
        'progress_tasks',
        'task-1',
        'insert',
        '{}',
        Date.now(),
      );

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO op_log (hlc, origin_peer_id, table_name, pk, op_type, payload, applied_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          '00000000000000000001.00000000.aaaaaaaa',
          'peer-a',
          'progress_tasks',
          'task-1',
          'insert',
          '{}',
          Date.now(),
        ),
    ).toThrow(/UNIQUE/);
  });

  it('row_meta has composite PK on (table_name, pk, column_name)', () => {
    sqlite
      .prepare(
        `INSERT INTO row_meta (table_name, pk, column_name, hlc, origin_peer_id) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        'progress_tasks',
        'task-1',
        'title',
        '00000000000000000001.00000000.aaaaaaaa',
        'peer-a',
      );

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO row_meta (table_name, pk, column_name, hlc, origin_peer_id) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          'progress_tasks',
          'task-1',
          'title',
          '00000000000000000002.00000000.aaaaaaaa',
          'peer-b',
        ),
    ).toThrow(/PRIMARY KEY|UNIQUE/);
  });
});
