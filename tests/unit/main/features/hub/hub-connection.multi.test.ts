/**
 * Unit tests for the multi-hub HubConnectionManager (Task 23).
 *
 * Covers:
 *  - addHub({ makeActive: true }) sets activeHubId and emits
 *    beforeActiveHubChange.
 *  - setActive swaps the active hub and emits beforeActiveHubChange
 *    with { from, to }.
 *  - setActive to the current active hub is a no-op (no event).
 *  - removeHub of the active hub picks another if available, else
 *    sets activeHubId to null.
 *  - removeHub of a non-active hub does not change activeHubId.
 *  - renameHub updates the record's displayName.
 *  - onBeforeActiveHubChange handlers can await async work before
 *    the swap completes.
 *  - getActiveHub returns the record matching activeHubId.
 *  - Backward-compat: configure(url, key) persists a record and
 *    activates it.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { AdcDatabase } from '@main/db';
import * as schema from '@main/db/schema';
import type { PersistedHubRecord } from '@main/features/hub/hub-config-store';
import { createHubConnectionManager } from '@main/features/hub/hub-connection';
import type { IpcRouter } from '@main/ipc/router';

// ── Module-level mocks ────────────────────────────────────────────
//
// The real hub-client performs fetch; the real hub-ws-client opens a
// WebSocket. Mock both so connect() / setActive() don't trigger
// network I/O. Health check resolves successfully so connect() reaches
// the `connected` status branch. `vi.mock` calls are hoisted by Vitest
// so they apply before the SUT import above.

vi.mock('@main/features/hub/hub-client', () => ({
  createHubClient: vi.fn(() => ({
    healthCheck: vi.fn(() => Promise.resolve({ success: true })),
  })),
}));

vi.mock('@main/features/hub/hub-ws-client', () => ({
  createHubWsClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    cancelReconnect: vi.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────

function createTestDb(): AdcDatabase {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings_kv (
      id TEXT,
      key TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'settings',
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

function createMockRouter(): IpcRouter {
  return {
    emit: vi.fn(),
    handle: vi.fn(),
  } as unknown as IpcRouter;
}

function makeRecord(
  overrides: Partial<PersistedHubRecord> = {},
): PersistedHubRecord {
  return {
    hubId: 'hub-a',
    displayName: 'Hub A',
    lastKnownUrl: 'https://a.example:5173',
    encryptedApiKey: 'enc:key-a',
    pinnedFingerprint: null,
    dbPath: 'hubs/hub-a/adc.db',
    clientIdentityRef: null,
    addedAt: '2026-04-23T00:00:00.000Z',
    lastConnectedAt: null,
    ...overrides,
  };
}

// ── Fixtures ───────────────────────────────────────────────────────

let db: AdcDatabase;
let dataDir: string;
let router: IpcRouter;

beforeEach(() => {
  db = createTestDb();
  dataDir = mkdtempSync(join(tmpdir(), 'hub-conn-test-'));
  router = createMockRouter();
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

// ── Specs ──────────────────────────────────────────────────────────

describe('HubConnectionManager — multi-hub', () => {
  it('starts with an empty hub list and null active hub', () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    expect(mgr.listHubs()).toEqual([]);
    expect(mgr.getActiveHubId()).toBeNull();
    expect(mgr.getActiveHub()).toBeNull();
  });

  it('addHub without makeActive appends but does not activate', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    const record = makeRecord({ hubId: 'hub-a' });
    await mgr.addHub(record);

    expect(mgr.listHubs()).toHaveLength(1);
    expect(mgr.getActiveHubId()).toBeNull();
    expect(onBefore).not.toHaveBeenCalled();
  });

  it('addHub({ makeActive: true }) sets activeHubId and emits beforeActiveHubChange', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    const record = makeRecord({ hubId: 'hub-a' });
    await mgr.addHub(record, { makeActive: true });

    expect(mgr.getActiveHubId()).toBe('hub-a');
    expect(onBefore).toHaveBeenCalledTimes(1);
    expect(onBefore).toHaveBeenCalledWith({ from: null, to: 'hub-a' });
  });

  it('setActive swaps active hub and emits beforeActiveHubChange with {from, to}', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });
    await mgr.addHub(makeRecord({ hubId: 'hub-b', displayName: 'Hub B' }));

    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    await mgr.setActive('hub-b');

    expect(mgr.getActiveHubId()).toBe('hub-b');
    expect(onBefore).toHaveBeenCalledTimes(1);
    expect(onBefore).toHaveBeenCalledWith({ from: 'hub-a', to: 'hub-b' });
  });

  it('setActive to the current active hub is a no-op (no event)', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });

    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    await mgr.setActive('hub-a');

    expect(onBefore).not.toHaveBeenCalled();
    expect(mgr.getActiveHubId()).toBe('hub-a');
  });

  it('removeHub for the active hub swaps to another when available', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });
    await mgr.addHub(makeRecord({ hubId: 'hub-b', displayName: 'Hub B' }));

    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    await mgr.removeHub('hub-a');

    expect(mgr.listHubs().map((h) => h.hubId)).toEqual(['hub-b']);
    expect(mgr.getActiveHubId()).toBe('hub-b');
    expect(onBefore).toHaveBeenCalledWith({ from: 'hub-a', to: 'hub-b' });
  });

  it('removeHub for the last active hub sets activeHubId to null', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });

    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    await mgr.removeHub('hub-a');

    expect(mgr.listHubs()).toEqual([]);
    expect(mgr.getActiveHubId()).toBeNull();
    expect(onBefore).toHaveBeenCalledWith({ from: 'hub-a', to: null });
  });

  it('removeHub for a non-active hub does not change active', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });
    await mgr.addHub(makeRecord({ hubId: 'hub-b', displayName: 'Hub B' }));

    const onBefore = vi.fn();
    mgr.onBeforeActiveHubChange(onBefore);

    await mgr.removeHub('hub-b');

    expect(mgr.getActiveHubId()).toBe('hub-a');
    expect(mgr.listHubs().map((h) => h.hubId)).toEqual(['hub-a']);
    expect(onBefore).not.toHaveBeenCalled();
  });

  it('renameHub updates displayName of the matching record', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a', displayName: 'Original' }));

    await mgr.renameHub('hub-a', 'Renamed');

    const [rec] = mgr.listHubs();
    expect(rec.displayName).toBe('Renamed');
  });

  it('renameHub for an unknown hubId is a no-op', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }));

    await mgr.renameHub('unknown', 'Ghost');

    expect(mgr.listHubs()[0].displayName).toBe('Hub A');
  });

  it('onBeforeActiveHubChange awaits async handler work before the swap completes', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });
    await mgr.addHub(makeRecord({ hubId: 'hub-b', displayName: 'Hub B' }));

    const observedActiveIdAtHandlerStart: Array<string | null> = [];
    let handlerResolved = false;

    mgr.onBeforeActiveHubChange(async () => {
      // At handler-invocation time the swap MUST NOT have applied yet.
      observedActiveIdAtHandlerStart.push(mgr.getActiveHubId());
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
      handlerResolved = true;
    });

    await mgr.setActive('hub-b');

    expect(observedActiveIdAtHandlerStart).toEqual(['hub-a']);
    expect(handlerResolved).toBe(true);
    expect(mgr.getActiveHubId()).toBe('hub-b');
  });

  it('getActiveHub returns the record matching activeHubId', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    const record = makeRecord({ hubId: 'hub-a', displayName: 'Primary' });
    await mgr.addHub(record, { makeActive: true });

    const active = mgr.getActiveHub();
    expect(active).not.toBeNull();
    expect(active?.hubId).toBe('hub-a');
    expect(active?.displayName).toBe('Primary');
  });

  it('onBeforeActiveHubChange returns an unsubscribe function', async () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    await mgr.addHub(makeRecord({ hubId: 'hub-a' }), { makeActive: true });
    await mgr.addHub(makeRecord({ hubId: 'hub-b', displayName: 'Hub B' }));

    const onBefore = vi.fn();
    const off = mgr.onBeforeActiveHubChange(onBefore);
    off();

    await mgr.setActive('hub-b');
    expect(onBefore).not.toHaveBeenCalled();
  });
});

describe('HubConnectionManager — backward-compat', () => {
  it('configure(url, key) persists a record and activates it', () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });

    const connection = mgr.configure('https://hub.example.com:5173', 'secret');

    expect(connection.hubUrl).toBe('https://hub.example.com:5173');
    expect(connection.apiKey).toBe('secret');

    const active = mgr.getActiveHub();
    expect(active).not.toBeNull();
    expect(active?.lastKnownUrl).toBe('https://hub.example.com:5173');
    expect(mgr.listHubs()).toHaveLength(1);
  });

  it('configure strips trailing slashes from the url', () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    mgr.configure('https://hub.example.com:5173///', 'secret');
    expect(mgr.getActiveHub()?.lastKnownUrl).toBe('https://hub.example.com:5173');
  });

  it('configure called twice overwrites the existing active record', () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    mgr.configure('https://first.example:5173', 'key-one');
    const firstId = mgr.getActiveHubId();

    mgr.configure('https://second.example:5173', 'key-two');

    expect(mgr.listHubs()).toHaveLength(1);
    expect(mgr.getActiveHubId()).toBe(firstId);
    expect(mgr.getActiveHub()?.lastKnownUrl).toBe('https://second.example:5173');
  });

  it('removeConfig clears the stored hub list', () => {
    const mgr = createHubConnectionManager({ router, db, dataDir });
    mgr.configure('https://hub.example.com:5173', 'secret');
    mgr.removeConfig();

    expect(mgr.listHubs()).toEqual([]);
    expect(mgr.getActiveHubId()).toBeNull();
  });
});
