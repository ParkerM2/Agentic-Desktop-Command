import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Op } from '@shared/replication/op-types';

import * as schema from '@main/db/schema';
import { createReplicationEngine, type ReplicationEngine } from '@main/features/peers/replication-engine';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let engine: ReplicationEngine;

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  engine = createReplicationEngine({
    db,
    peerIdShort: 'aaaaaaaa',
    peerIdFull: 'peer-a',
    clock: () => 1_000,
  });
});

afterEach(() => sqlite.close());

describe('ReplicationEngine.recordLocalWrite', () => {
  it('appends an op with freshly-minted HLC', () => {
    const op = engine.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'task-1',
      opType: 'insert',
      columns: { title: 'First', status: 'backlog' },
    });

    expect(op.originPeerId).toBe('peer-a');
    expect(op.hlc).toMatch(/\.aaaaaaaa$/);
    expect(op.payload.title.value).toBe('First');
    expect(op.payload.status.value).toBe('backlog');
    expect(op.payload.title.hlc).toBe(op.hlc);
  });

  it('writes row_meta entries for every mutated column', () => {
    engine.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'task-1',
      opType: 'insert',
      columns: { title: 'X', status: 'backlog' },
    });
    const metas = sqlite
      .prepare(`SELECT column_name FROM row_meta WHERE table_name='progress_tasks' AND pk='task-1'`)
      .all() as Array<{ column_name: string }>;
    expect(metas.map((m) => m.column_name).sort()).toEqual(['status', 'title']);
  });
});

describe('ReplicationEngine.applyRemoteOp', () => {
  function seedTask(slug: string) {
    sqlite
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(slug, 'Seed', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');
  }

  it('applies an incoming insert op to progress_tasks', () => {
    const op: Op = {
      hlc: '00000000000000099999.00000000.bbbbbbbb',
      originPeerId: 'peer-b',
      tableName: 'progress_tasks',
      pk: 'task-remote',
      opType: 'insert',
      payload: {
        slug: { value: 'task-remote', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        title: { value: 'Remote', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        status: { value: 'backlog', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        priority: { value: 'medium', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        created_at: { value: '2026-04-24T00:00:00Z', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        updated_at: { value: '2026-04-24T00:00:00Z', hlc: '00000000000000099999.00000000.bbbbbbbb' },
      },
    };

    engine.applyRemoteOp(op);

    const row = sqlite.prepare(`SELECT * FROM progress_tasks WHERE slug='task-remote'`).get();
    expect(row).toBeDefined();
    expect((row as { title: string }).title).toBe('Remote');
  });

  it('applies an incoming update with column-level LWW', () => {
    // Peer A wrote locally: title='Local-title', status='backlog'. Stamp row_meta via recordLocalWrite.
    sqlite
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('task-1', 'Local-title', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

    engine.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'task-1',
      opType: 'update',
      columns: { title: 'Local-title', status: 'backlog' },
    });

    const incoming: Op = {
      hlc: '00000000000009999999.00000000.bbbbbbbb',
      originPeerId: 'peer-b',
      tableName: 'progress_tasks',
      pk: 'task-1',
      opType: 'update',
      payload: {
        status: { value: 'executing', hlc: '00000000000009999999.00000000.bbbbbbbb' },
      },
    };

    engine.applyRemoteOp(incoming);

    const row = sqlite.prepare(`SELECT title, status FROM progress_tasks WHERE slug='task-1'`).get() as {
      title: string;
      status: string;
    };
    expect(row.title).toBe('Local-title');
    expect(row.status).toBe('executing');
  });

  it('applies a delete by removing the row and stamping tombstone', () => {
    seedTask('task-del');
    engine.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'task-del',
      opType: 'update',
      columns: { title: 'Exists' },
    });

    const del: Op = {
      hlc: '00000000000009999999.00000000.bbbbbbbb',
      originPeerId: 'peer-b',
      tableName: 'progress_tasks',
      pk: 'task-del',
      opType: 'delete',
      payload: {},
    };
    engine.applyRemoteOp(del);

    const row = sqlite.prepare(`SELECT * FROM progress_tasks WHERE slug='task-del'`).get();
    expect(row).toBeUndefined();

    const tombstone = sqlite
      .prepare(`SELECT * FROM row_meta WHERE pk='task-del' AND column_name='__deleted__'`)
      .get();
    expect(tombstone).toBeDefined();
  });

  it('rejects ops with invalid column names', () => {
    const op: Op = {
      hlc: '00000000000000099999.00000000.bbbbbbbb',
      originPeerId: 'peer-b',
      tableName: 'progress_tasks',
      pk: 'task-bad',
      opType: 'insert',
      payload: {
        'title"; DROP TABLE progress_tasks; --': { value: 'x', hlc: '00000000000000099999.00000000.bbbbbbbb' },
      },
    };
    expect(() => engine.applyRemoteOp(op)).toThrow(/invalid column name/);
  });

  it('is idempotent — applying same op twice is safe', () => {
    const op: Op = {
      hlc: '00000000000000099999.00000000.bbbbbbbb',
      originPeerId: 'peer-b',
      tableName: 'progress_tasks',
      pk: 'task-idem',
      opType: 'insert',
      payload: {
        slug: { value: 'task-idem', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        title: { value: 'Idempotent', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        status: { value: 'backlog', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        priority: { value: 'medium', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        created_at: { value: '2026-04-24T00:00:00Z', hlc: '00000000000000099999.00000000.bbbbbbbb' },
        updated_at: { value: '2026-04-24T00:00:00Z', hlc: '00000000000000099999.00000000.bbbbbbbb' },
      },
    };

    engine.applyRemoteOp(op);
    engine.applyRemoteOp(op);

    const count = sqlite.prepare(`SELECT COUNT(*) as c FROM op_log WHERE pk='task-idem'`).get() as {
      c: number;
    };
    expect(count.c).toBe(1);
  });
});
