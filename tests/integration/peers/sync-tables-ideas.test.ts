// tests/integration/peers/sync-tables-ideas.test.ts
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

describe('sync-tables: ideas round-trip', () => {
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

  it('A idea insert appears on B', async () => {
    sqliteA
      .prepare(
        `INSERT INTO ideas (id, title, description, status, category, tags, project_id, votes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('idea-sync-1', 'Big idea', 'Idea body', 'new', 'feature', '[]', null, 0, '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

    engineA.recordLocalWrite({
      tableName: 'ideas',
      pk: 'idea-sync-1',
      opType: 'insert',
      columns: {
        id: 'idea-sync-1',
        title: 'Big idea',
        description: 'Idea body',
        status: 'new',
        category: 'feature',
        tags: '[]',
        project_id: null,
        votes: 0,
        created_at: '2026-04-24T00:00:00Z',
        updated_at: '2026-04-24T00:00:00Z',
      },
    });

    const row = await waitFor(() =>
      sqliteB.prepare(`SELECT title FROM ideas WHERE id='idea-sync-1'`).get() as
        | { title: string }
        | undefined,
    );
    expect(row.title).toBe('Big idea');
  });
});
