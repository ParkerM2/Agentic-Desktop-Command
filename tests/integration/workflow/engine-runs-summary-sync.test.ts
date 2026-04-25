// tests/integration/workflow/engine-runs-summary-sync.test.ts
//
// Verifies the Phase 4 dual-write contract for workflow_runs_summary:
//
// 1. A direct insert + recordLocalWrite on instance A propagates to instance B
//    via the existing WS transport, proving SYNC_TABLES wiring works for the
//    workflow_runs_summary table (the engine's terminal-state hook produces
//    exactly this shape of op).
// 2. ReplicationEngine exposes getLocalPeerId so the engine can stamp
//    ran_on_peer_id on each summary row.

import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@main/db/schema';
import { createReplicationEngine, type ReplicationEngine } from '@main/features/peers/replication-engine';
import { createWsTransport, type WsTransport } from '@main/features/peers/ws-transport';

async function waitFor<T>(fn: () => T | undefined, timeoutMs = 3000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = fn();
    if (v !== undefined) return v;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20);
    });
  }
  throw new Error('waitFor timed out');
}

describe('workflow_runs_summary dual-write sync', () => {
  let sqliteA: Database.Database;
  let sqliteB: Database.Database;
  let engineA: ReplicationEngine;
  let engineB: ReplicationEngine;
  let transportA: WsTransport;
  let transportB: WsTransport;

  beforeEach(async () => {
    sqliteA = new Database(':memory:');
    sqliteB = new Database(':memory:');
    const dbA = drizzle(sqliteA, { schema });
    const dbB = drizzle(sqliteB, { schema });
    migrate(dbA, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    migrate(dbB, { migrationsFolder: resolve(__dirname, '../../../drizzle') });

    engineA = createReplicationEngine({ db: dbA, peerIdShort: 'aaaaaaaa', peerIdFull: 'peer-a' });
    engineB = createReplicationEngine({ db: dbB, peerIdShort: 'bbbbbbbb', peerIdFull: 'peer-b' });

    transportA = await createWsTransport({
      engine: engineA, listenPort: 0, remoteUrl: '', schemaHash: 'match',
    });
    const portA = transportA.listenPort();
    transportB = await createWsTransport({
      engine: engineB,
      listenPort: 0,
      remoteUrl: `ws://127.0.0.1:${String(portA)}`,
      schemaHash: 'match',
    });

    await waitFor(() => (transportB.isConnected() && transportA.isConnected() ? true : undefined));
  });

  afterEach(async () => {
    await transportA.close();
    await transportB.close();
    sqliteA.close();
    sqliteB.close();
  });

  it('exposes getLocalPeerId on the local engine', () => {
    expect(engineA.getLocalPeerId()).toBe('peer-a');
    expect(engineB.getLocalPeerId()).toBe('peer-b');
  });

  it('terminal-state summary written on A appears on B with the local peer id', async () => {
    // Mimic exactly what writeRunSummary does in the workflow engine: insert
    // into the local user table, then announce the op via recordLocalWrite.
    const runId = 'run-terminal-passed';
    const startedAt = 1_700_000_000_000;
    const finishedAt = 1_700_000_005_000;
    const ranOnPeerId = engineA.getLocalPeerId();

    sqliteA
      .prepare(
        `INSERT INTO workflow_runs_summary
           (id, project_id, task_id, workflow_id, status, started_at, finished_at, summary, ran_on_peer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(runId, '/path/to/proj', null, 'tpl-1', 'passed', startedAt, finishedAt, null, ranOnPeerId);

    engineA.recordLocalWrite({
      tableName: 'workflow_runs_summary',
      pk: runId,
      opType: 'insert',
      columns: {
        id: runId,
        project_id: '/path/to/proj',
        task_id: null,
        workflow_id: 'tpl-1',
        status: 'passed',
        started_at: startedAt,
        finished_at: finishedAt,
        summary: null,
        ran_on_peer_id: ranOnPeerId,
      },
    });

    const row = await waitFor(() =>
      sqliteB
        .prepare(
          `SELECT id, status, ran_on_peer_id, finished_at FROM workflow_runs_summary WHERE id=?`,
        )
        .get(runId) as
        | { id: string; status: string; ran_on_peer_id: string; finished_at: number }
        | undefined,
    );

    expect(row.id).toBe(runId);
    expect(row.status).toBe('passed');
    expect(row.ran_on_peer_id).toBe('peer-a');
    expect(row.finished_at).toBe(finishedAt);
  });

  it('failed terminal-state summary carries the error message', async () => {
    const runId = 'run-terminal-failed';
    const startedAt = 1_700_000_010_000;
    const finishedAt = 1_700_000_015_000;
    const ranOnPeerId = engineA.getLocalPeerId();
    const errorMessage = 'preflight failed: missing claude binary';

    sqliteA
      .prepare(
        `INSERT INTO workflow_runs_summary
           (id, project_id, task_id, workflow_id, status, started_at, finished_at, summary, ran_on_peer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(runId, '/path/to/proj', null, null, 'failed', startedAt, finishedAt, errorMessage, ranOnPeerId);

    engineA.recordLocalWrite({
      tableName: 'workflow_runs_summary',
      pk: runId,
      opType: 'insert',
      columns: {
        id: runId,
        project_id: '/path/to/proj',
        task_id: null,
        workflow_id: null,
        status: 'failed',
        started_at: startedAt,
        finished_at: finishedAt,
        summary: errorMessage,
        ran_on_peer_id: ranOnPeerId,
      },
    });

    const row = await waitFor(() =>
      sqliteB
        .prepare(`SELECT status, summary FROM workflow_runs_summary WHERE id=?`)
        .get(runId) as
        | { status: string; summary: string }
        | undefined,
    );

    expect(row.status).toBe('failed');
    expect(row.summary).toBe(errorMessage);
  });
});
