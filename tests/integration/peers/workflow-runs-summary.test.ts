import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Op } from '@shared/replication/op-types';

import * as schema from '@main/db/schema';
import { createReplicationEngine, type ReplicationEngine } from '@main/features/peers/replication-engine';

interface Peer {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
  engine: ReplicationEngine;
  inbox: Op[];
}

function makePeer(peerIdShort: string, peerIdFull: string): Peer {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  const engine = createReplicationEngine({ db, peerIdShort, peerIdFull });
  return { sqlite, db, engine, inbox: [] };
}

function wire(a: Peer, b: Peer): void {
  a.engine.onLocalOp((op) => b.inbox.push(op));
  b.engine.onLocalOp((op) => a.inbox.push(op));
}

function drain(p: Peer): void {
  while (p.inbox.length > 0) p.engine.applyRemoteOp(p.inbox.shift()!);
}

describe('workflow_runs_summary replication', () => {
  let A: Peer;
  let B: Peer;

  beforeEach(() => {
    A = makePeer('aaaaaaaa', 'peer-a');
    B = makePeer('bbbbbbbb', 'peer-b');
    wire(A, B);
  });

  afterEach(() => {
    A.sqlite.close();
    B.sqlite.close();
  });

  it('insert propagates from A to B', () => {
    A.sqlite
      .prepare(
        `INSERT INTO workflow_runs_summary (id, project_id, status, ran_on_peer_id) VALUES (?, ?, ?, ?)`,
      )
      .run('run-1', 'project-x', 'running', 'peer-a');

    A.engine.recordLocalWrite({
      tableName: 'workflow_runs_summary',
      pk: 'run-1',
      opType: 'insert',
      columns: {
        id: 'run-1',
        project_id: 'project-x',
        status: 'running',
        ran_on_peer_id: 'peer-a',
      },
    });

    drain(B);

    const row = B.sqlite.prepare(`SELECT * FROM workflow_runs_summary WHERE id='run-1'`).get();
    expect(row).toBeDefined();
    expect((row as { status: string }).status).toBe('running');
  });

  it('status transition (running → passed) propagates', () => {
    A.sqlite
      .prepare(
        `INSERT INTO workflow_runs_summary (id, project_id, status, ran_on_peer_id) VALUES (?, ?, ?, ?)`,
      )
      .run('run-2', 'project-x', 'running', 'peer-a');
    A.engine.recordLocalWrite({
      tableName: 'workflow_runs_summary',
      pk: 'run-2',
      opType: 'insert',
      columns: {
        id: 'run-2', project_id: 'project-x', status: 'running', ran_on_peer_id: 'peer-a',
      },
    });
    drain(B);

    A.sqlite
      .prepare(`UPDATE workflow_runs_summary SET status=?, finished_at=? WHERE id=?`)
      .run('passed', 1_000_000, 'run-2');
    A.engine.recordLocalWrite({
      tableName: 'workflow_runs_summary',
      pk: 'run-2',
      opType: 'update',
      columns: { status: 'passed', finished_at: 1_000_000 },
    });
    drain(B);

    const row = B.sqlite.prepare(`SELECT status, finished_at FROM workflow_runs_summary WHERE id='run-2'`).get() as {
      status: string; finished_at: number;
    };
    expect(row.status).toBe('passed');
    expect(row.finished_at).toBe(1_000_000);
  });
});
