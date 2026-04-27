import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '@main/db/schema';
import { createCrossDeviceQuery } from '@main/features/assistant/cross-device-query';
import { createOpLogService } from '@main/features/peers/op-log';
import { createPeerStore } from '@main/features/peers/peer-store';
import { progressTasks } from '@main/features/progress/schema';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;

const NOW = 1_700_000_000_000; // fixed Date.now() reference

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
  sqlite.close();
});

function insertTask(slug: string, title: string, status = 'in_progress'): void {
  const iso = new Date(NOW).toISOString();
  db.insert(progressTasks)
    .values({
      slug,
      id: slug,
      title,
      status,
      priority: 'medium',
      createdAt: iso,
      updatedAt: iso,
    })
    .run();
}

function appendTaskOp(originPeerId: string, slug: string, hlc: string): void {
  const opLogSvc = createOpLogService(db);
  opLogSvc.append({
    hlc,
    originPeerId,
    tableName: 'progress_tasks',
    pk: slug,
    opType: 'insert',
    payload: {} as never,
  });
}

const basePeer = {
  pubkey: 'base64-pubkey',
  certFingerprint: 'a'.repeat(64),
  pairedAt: NOW - 10 * 60 * 60 * 1000,
};

describe('cross-device-query', () => {
  it('returns "No devices paired." when no peers exist', async () => {
    const peerStore = createPeerStore(db);
    const q = createCrossDeviceQuery({ db, peerStore });
    const out = await q.query('');
    expect(out).toBe('No devices paired.');
  });

  it('lists all devices with their state and tasks', async () => {
    const peerStore = createPeerStore(db);
    // online: connected 30s ago
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-online',
      displayName: 'Online Mac',
      lastConnectedAt: NOW - 30 * 1000,
    });
    // sleeping: connected 10 minutes ago
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-sleeping',
      displayName: 'Sleeping Linux',
      lastConnectedAt: NOW - 10 * 60 * 1000,
    });
    // offline: connected 2 hours ago
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-offline',
      displayName: 'Offline Win',
      lastConnectedAt: NOW - 2 * 60 * 60 * 1000,
    });
    // unreachable: never connected
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-unknown',
      displayName: 'Brand New',
      lastConnectedAt: null,
    });

    insertTask('task-1', 'Build feature X');
    insertTask('task-2', 'Fix bug Y');
    appendTaskOp('peer-online', 'task-1', '00000000000000000001.00000000.aaaaaaaa');
    appendTaskOp('peer-sleeping', 'task-2', '00000000000000000002.00000000.aaaaaaaa');

    const q = createCrossDeviceQuery({ db, peerStore });
    const out = await q.query('');

    expect(out).toContain('All devices (4):');
    expect(out).toContain('[online] Online Mac');
    expect(out).toContain('Build feature X [in_progress]');
    expect(out).toContain('[sleeping] Sleeping Linux');
    // Sleeping device should NOT show its tasks
    expect(out).not.toContain('Fix bug Y');
    expect(out).toContain('[offline] Offline Win');
    expect(out).toContain('[unreachable] Brand New');
  });

  it('filters devices by partial name match', async () => {
    const peerStore = createPeerStore(db);
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-a',
      displayName: 'MacBook Pro',
      lastConnectedAt: NOW - 30 * 1000,
    });
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-b',
      displayName: 'Windows Desktop',
      lastConnectedAt: NOW - 30 * 1000,
    });

    const q = createCrossDeviceQuery({ db, peerStore });
    const out = await q.query('mac');

    expect(out).toContain('Device status for "mac":');
    expect(out).toContain('MacBook Pro');
    expect(out).not.toContain('Windows Desktop');
  });

  it('returns "No device found" for nonexistent filter', async () => {
    const peerStore = createPeerStore(db);
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-a',
      displayName: 'MacBook Pro',
      lastConnectedAt: NOW - 30 * 1000,
    });

    const q = createCrossDeviceQuery({ db, peerStore });
    const out = await q.query('nonexistent');
    expect(out).toBe('No device found matching "nonexistent".');
  });

  it('only includes non-archived tasks', async () => {
    const peerStore = createPeerStore(db);
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-online',
      displayName: 'Online Mac',
      lastConnectedAt: NOW - 30 * 1000,
    });

    const iso = new Date(NOW).toISOString();
    db.insert(progressTasks)
      .values({
        slug: 'live-task',
        id: 'live-task',
        title: 'Live work',
        status: 'in_progress',
        priority: 'medium',
        createdAt: iso,
        updatedAt: iso,
      })
      .run();
    db.insert(progressTasks)
      .values({
        slug: 'archived-task',
        id: 'archived-task',
        title: 'Old work',
        status: 'completed',
        priority: 'medium',
        archivedAt: iso,
        createdAt: iso,
        updatedAt: iso,
      })
      .run();
    appendTaskOp('peer-online', 'live-task', '00000000000000000001.00000000.aaaaaaaa');
    appendTaskOp('peer-online', 'archived-task', '00000000000000000002.00000000.aaaaaaaa');

    const q = createCrossDeviceQuery({ db, peerStore });
    const out = await q.query('');

    expect(out).toContain('Live work');
    expect(out).not.toContain('Old work');
  });

  it('excludes revoked peers', async () => {
    const peerStore = createPeerStore(db);
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-a',
      displayName: 'Active',
      lastConnectedAt: NOW - 30 * 1000,
    });
    peerStore.upsert({
      ...basePeer,
      peerId: 'peer-b',
      displayName: 'Revoked',
      lastConnectedAt: NOW - 30 * 1000,
    });
    peerStore.revoke('peer-b', NOW);

    const q = createCrossDeviceQuery({ db, peerStore });
    const out = await q.query('');
    expect(out).toContain('All devices (1):');
    expect(out).toContain('Active');
    expect(out).not.toContain('Revoked');
  });
});
