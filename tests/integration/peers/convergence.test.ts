// tests/integration/peers/convergence.test.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@main/db/schema';
import { createReplicationEngine, type ReplicationEngine } from '@main/features/peers/replication-engine';
import type { Op } from '@shared/replication/op-types';

interface Peer {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
  engine: ReplicationEngine;
  inbox: Op[];
}

function makePeer(peerIdShort: string, peerIdFull: string, clockRef: { now: number }): Peer {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  const engine = createReplicationEngine({
    db,
    peerIdShort,
    peerIdFull,
    clock: () => clockRef.now,
  });
  return { sqlite, db, engine, inbox: [] };
}

function wireBus(a: Peer, b: Peer): { disconnect: () => void; reconnect: () => void } {
  let connected = true;
  a.engine.onLocalOp((op) => {
    if (connected) b.inbox.push(op);
  });
  b.engine.onLocalOp((op) => {
    if (connected) a.inbox.push(op);
  });
  return {
    disconnect: () => { connected = false; },
    reconnect: () => { connected = true; },
  };
}

function drain(peer: Peer): void {
  while (peer.inbox.length > 0) {
    const op = peer.inbox.shift()!;
    peer.engine.applyRemoteOp(op);
  }
}

function readTask(peer: Peer, slug: string): Record<string, unknown> | undefined {
  return peer.sqlite.prepare(`SELECT * FROM progress_tasks WHERE slug=?`).get(slug) as
    | Record<string, unknown>
    | undefined;
}

function rowToOp(row: Record<string, unknown>): Op {
  return {
    hlc: row.hlc as string,
    originPeerId: row.origin_peer_id as string,
    tableName: row.table_name as Op['tableName'],
    pk: row.pk as string,
    opType: row.op_type as Op['opType'],
    payload: JSON.parse(row.payload as string),
  };
}

function localInsert(peer: Peer, slug: string, title: string): void {
  // Simulate a service-layer insert: write to user table, then register op.
  peer.sqlite
    .prepare(
      `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(slug, title, 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

  peer.engine.recordLocalWrite({
    tableName: 'progress_tasks',
    pk: slug,
    opType: 'insert',
    columns: {
      slug,
      title,
      status: 'backlog',
      priority: 'medium',
      created_at: '2026-04-24T00:00:00Z',
      updated_at: '2026-04-24T00:00:00Z',
    },
  });
}

function localUpdate(peer: Peer, slug: string, columns: Record<string, unknown>): void {
  // Service would write to user table, then register op.
  const cols = Object.keys(columns);
  if (cols.length > 0) {
    peer.sqlite
      .prepare(
        `UPDATE progress_tasks SET ${cols.map((c) => `"${c}"=?`).join(', ')} WHERE slug=?`,
      )
      .run(...cols.map((c) => columns[c]), slug);
  }
  peer.engine.recordLocalWrite({
    tableName: 'progress_tasks',
    pk: slug,
    opType: 'update',
    columns,
  });
}

function localDelete(peer: Peer, slug: string): void {
  peer.sqlite.prepare(`DELETE FROM progress_tasks WHERE slug=?`).run(slug);
  peer.engine.recordLocalWrite({
    tableName: 'progress_tasks',
    pk: slug,
    opType: 'delete',
    columns: {},
  });
}

describe('two-peer convergence', () => {
  let clockRef: { now: number };
  let A: Peer;
  let B: Peer;
  let bus: ReturnType<typeof wireBus>;

  beforeEach(() => {
    clockRef = { now: 1_000_000_000 };
    A = makePeer('aaaaaaaa', 'peer-a', clockRef);
    B = makePeer('bbbbbbbb', 'peer-b', clockRef);
    bus = wireBus(A, B);
  });

  afterEach(() => {
    A.sqlite.close();
    B.sqlite.close();
  });

  it('insert on A appears on B', () => {
    localInsert(A, 'task-1', 'Hello');
    drain(B);
    const onB = readTask(B, 'task-1');
    expect(onB?.title).toBe('Hello');
  });

  it('converges after partition — disjoint writes', () => {
    bus.disconnect();
    clockRef.now = 1_000_001;
    localInsert(A, 'task-a', 'From A');
    clockRef.now = 1_000_002;
    localInsert(B, 'task-b', 'From B');
    bus.reconnect();

    // Pull-on-reconnect: replay each peer's local op_log to the other.
    const aOps = A.sqlite.prepare(`SELECT * FROM op_log WHERE origin_peer_id='peer-a'`).all() as Array<Record<string, unknown>>;
    const bOps = B.sqlite.prepare(`SELECT * FROM op_log WHERE origin_peer_id='peer-b'`).all() as Array<Record<string, unknown>>;
    for (const row of aOps) B.engine.applyRemoteOp(rowToOp(row));
    for (const row of bOps) A.engine.applyRemoteOp(rowToOp(row));

    expect(readTask(A, 'task-a')?.title).toBe('From A');
    expect(readTask(A, 'task-b')?.title).toBe('From B');
    expect(readTask(B, 'task-a')?.title).toBe('From A');
    expect(readTask(B, 'task-b')?.title).toBe('From B');
  });

  it('column-level LWW — different fields of same task edited on both', () => {
    localInsert(A, 'task-1', 'Initial');
    drain(B);

    bus.disconnect();
    clockRef.now = 2_000_000;
    localUpdate(A, 'task-1', { title: 'A-title' });
    clockRef.now = 2_000_001;
    localUpdate(B, 'task-1', { status: 'executing' });
    bus.reconnect();

    const aOps = A.sqlite
      .prepare(`SELECT * FROM op_log WHERE origin_peer_id='peer-a' AND pk='task-1'`)
      .all() as Array<Record<string, unknown>>;
    const bOps = B.sqlite
      .prepare(`SELECT * FROM op_log WHERE origin_peer_id='peer-b' AND pk='task-1'`)
      .all() as Array<Record<string, unknown>>;
    for (const row of aOps) B.engine.applyRemoteOp(rowToOp(row));
    for (const row of bOps) A.engine.applyRemoteOp(rowToOp(row));

    const onA = readTask(A, 'task-1');
    const onB = readTask(B, 'task-1');
    expect(onA?.title).toBe('A-title');
    expect(onA?.status).toBe('executing');
    expect(onB?.title).toBe('A-title');
    expect(onB?.status).toBe('executing');
  });

  it('delete wins over older update', () => {
    localInsert(A, 'task-del', 'Doomed');
    drain(B);

    bus.disconnect();
    clockRef.now = 3_000_000;
    localUpdate(B, 'task-del', { title: 'B tried to update' });
    clockRef.now = 3_000_001;
    localDelete(A, 'task-del');
    bus.reconnect();

    const aOps = A.sqlite
      .prepare(`SELECT * FROM op_log WHERE origin_peer_id='peer-a' AND pk='task-del'`)
      .all() as Array<Record<string, unknown>>;
    const bOps = B.sqlite
      .prepare(`SELECT * FROM op_log WHERE origin_peer_id='peer-b' AND pk='task-del'`)
      .all() as Array<Record<string, unknown>>;
    for (const row of aOps) B.engine.applyRemoteOp(rowToOp(row));
    for (const row of bOps) A.engine.applyRemoteOp(rowToOp(row));

    expect(readTask(A, 'task-del')).toBeUndefined();
    expect(readTask(B, 'task-del')).toBeUndefined();
  });

  it('duplicate op delivery is idempotent', () => {
    localInsert(A, 'task-idem', 'Once');
    drain(B);
    const op = rowToOp(
      A.sqlite.prepare(`SELECT * FROM op_log WHERE pk='task-idem'`).get() as Record<string, unknown>,
    );
    B.engine.applyRemoteOp(op);
    B.engine.applyRemoteOp(op);

    const count = B.sqlite.prepare(`SELECT COUNT(*) as c FROM op_log`).get() as { c: number };
    expect(count.c).toBe(1);
  });
});
