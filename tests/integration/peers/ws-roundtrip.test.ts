// tests/integration/peers/ws-roundtrip.test.ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@main/db/schema';
import { resolvePeerTls } from '@main/features/peers/peer-tls';
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

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('ws-transport roundtrip', () => {
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

  it('establishes a connection', () => {
    expect(transportA.isConnected()).toBe(true);
    expect(transportB.isConnected()).toBe(true);
  });

  it('A write appears on B within 1s', async () => {
    // Note: recordLocalWrite is metadata-only. On peer A we must also write to the user
    // table. On peer B, applyRemoteOp will write to B's user table automatically.
    sqliteA
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('task-over-ws', 'Hello from A', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

    engineA.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'task-over-ws',
      opType: 'insert',
      columns: {
        slug: 'task-over-ws',
        title: 'Hello from A',
        status: 'backlog',
        priority: 'medium',
        created_at: '2026-04-24T00:00:00Z',
        updated_at: '2026-04-24T00:00:00Z',
      },
    });

    const row = await waitFor(() =>
      sqliteB.prepare(`SELECT title FROM progress_tasks WHERE slug='task-over-ws'`).get() as
        | { title: string }
        | undefined,
    );
    expect(row.title).toBe('Hello from A');
  });

  it('B write appears on A within 1s', async () => {
    sqliteB
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('task-from-b', 'Hello from B', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

    engineB.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'task-from-b',
      opType: 'insert',
      columns: {
        slug: 'task-from-b',
        title: 'Hello from B',
        status: 'backlog',
        priority: 'medium',
        created_at: '2026-04-24T00:00:00Z',
        updated_at: '2026-04-24T00:00:00Z',
      },
    });

    const row = await waitFor(() =>
      sqliteA.prepare(`SELECT title FROM progress_tasks WHERE slug='task-from-b'`).get() as
        | { title: string }
        | undefined,
    );
    expect(row.title).toBe('Hello from B');
  });

  it('disconnects when peers disagree on schemaHash', async () => {
    await transportA.close();
    await transportB.close();

    const mismatchedA = await createWsTransport({
      engine: engineA, listenPort: 0, remoteUrl: '',
      schemaHash: 'a'.repeat(64),
    });
    const portA = mismatchedA.listenPort();
    const mismatchedB = await createWsTransport({
      engine: engineB, listenPort: 0, remoteUrl: `ws://127.0.0.1:${String(portA)}`,
      schemaHash: 'b'.repeat(64),
    });
    // eslint-disable-next-line require-atomic-updates -- sequential afterEach cleanup
    transportA = mismatchedA;
    // eslint-disable-next-line require-atomic-updates -- sequential afterEach cleanup
    transportB = mismatchedB;

    // Allow HELLO exchange + mismatch close
    await sleep(500);

    // A-originated write must NOT reach B
    sqliteA
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('mismatch-task', 'No', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');
    engineA.recordLocalWrite({
      tableName: 'progress_tasks', pk: 'mismatch-task', opType: 'insert',
      columns: {
        slug: 'mismatch-task', title: 'No', status: 'backlog', priority: 'medium',
        created_at: '2026-04-24T00:00:00Z', updated_at: '2026-04-24T00:00:00Z',
      },
    });

    await sleep(300);
    const row = sqliteB.prepare(`SELECT title FROM progress_tasks WHERE slug='mismatch-task'`).get();
    expect(row).toBeUndefined();
  });
});

describe('ws-transport TLS-pinned roundtrip', () => {
  let dataDirA: string;
  let dataDirB: string;
  let sqliteA: Database.Database;
  let sqliteB: Database.Database;
  let engineA: ReplicationEngine;
  let engineB: ReplicationEngine;
  let transportA: WsTransport;
  let transportB: WsTransport;

  beforeEach(() => {
    dataDirA = mkdtempSync(join(tmpdir(), 'ws-tls-a-'));
    dataDirB = mkdtempSync(join(tmpdir(), 'ws-tls-b-'));
    sqliteA = new Database(':memory:');
    sqliteB = new Database(':memory:');
    const dbA = drizzle(sqliteA, { schema });
    const dbB = drizzle(sqliteB, { schema });
    migrate(dbA, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    migrate(dbB, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    engineA = createReplicationEngine({ db: dbA, peerIdShort: 'aaaaaaaa', peerIdFull: 'peer-a' });
    engineB = createReplicationEngine({ db: dbB, peerIdShort: 'bbbbbbbb', peerIdFull: 'peer-b' });
  });

  afterEach(async () => {
    await transportA.close();
    await transportB.close();
    sqliteA.close();
    sqliteB.close();
    rmSync(dataDirA, { recursive: true, force: true });
    rmSync(dataDirB, { recursive: true, force: true });
  });

  it('B dials A over wss:// with the correct fingerprint and syncs a write', async () => {
    const tlsA = await resolvePeerTls(dataDirA, 'peer-a');
    transportA = await createWsTransport({
      engine: engineA,
      listenPort: 0,
      remoteUrl: '',
      schemaHash: 'tls-match',
      tls: tlsA,
    });
    const portA = transportA.listenPort();

    transportB = await createWsTransport({
      engine: engineB,
      listenPort: 0,
      remoteUrl: `wss://127.0.0.1:${String(portA)}`,
      schemaHash: 'tls-match',
      remotePeer: { peerId: 'peer-a', fingerprint: tlsA.fingerprint },
    });

    await waitFor(() => (transportB.isConnected() && transportA.isConnected() ? true : undefined));

    sqliteA
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('tls-task', 'TLS Hello', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');
    engineA.recordLocalWrite({
      tableName: 'progress_tasks', pk: 'tls-task', opType: 'insert',
      columns: {
        slug: 'tls-task', title: 'TLS Hello', status: 'backlog', priority: 'medium',
        created_at: '2026-04-24T00:00:00Z', updated_at: '2026-04-24T00:00:00Z',
      },
    });

    const row = await waitFor(() =>
      sqliteB.prepare(`SELECT title FROM progress_tasks WHERE slug='tls-task'`).get() as
        | { title: string }
        | undefined,
    );
    expect(row.title).toBe('TLS Hello');
  });

  it('refuses connection when the pinned fingerprint does not match', async () => {
    const tlsA = await resolvePeerTls(dataDirA, 'peer-a');
    transportA = await createWsTransport({
      engine: engineA,
      listenPort: 0,
      remoteUrl: '',
      schemaHash: 'tls-match',
      tls: tlsA,
    });
    const portA = transportA.listenPort();

    transportB = await createWsTransport({
      engine: engineB,
      listenPort: 0,
      remoteUrl: `wss://127.0.0.1:${String(portA)}`,
      schemaHash: 'tls-match',
      remotePeer: { peerId: 'peer-a', fingerprint: 'f'.repeat(64) },
    });

    // Allow handshake + close
    await sleep(500);

    sqliteA
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('tls-no-pin', 'No', 'backlog', 'medium', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');
    engineA.recordLocalWrite({
      tableName: 'progress_tasks', pk: 'tls-no-pin', opType: 'insert',
      columns: {
        slug: 'tls-no-pin', title: 'No', status: 'backlog', priority: 'medium',
        created_at: '2026-04-24T00:00:00Z', updated_at: '2026-04-24T00:00:00Z',
      },
    });

    await sleep(300);
    const row = sqliteB.prepare(`SELECT title FROM progress_tasks WHERE slug='tls-no-pin'`).get();
    expect(row).toBeUndefined();
  });
});
