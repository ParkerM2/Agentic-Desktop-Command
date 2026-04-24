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

describe('workflow_runs_summary migration', () => {
  it('creates the table with expected columns', () => {
    const cols = sqlite
      .prepare(`PRAGMA table_info(workflow_runs_summary)`)
      .all() as Array<{ name: string; notnull: number; pk: number }>;
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      ['finished_at', 'id', 'project_id', 'ran_on_peer_id', 'started_at', 'status', 'summary', 'task_id', 'workflow_id'].sort(),
    );
    const idCol = cols.find((c) => c.name === 'id');
    expect(idCol?.pk).toBe(1);
  });

  it('enforces NOT NULL on project_id, status, ran_on_peer_id', () => {
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO workflow_runs_summary (id, status, ran_on_peer_id) VALUES (?, ?, ?)`,
        )
        .run('run-1', 'running', 'peer-a'),
    ).toThrow(/NOT NULL/);
  });
});
