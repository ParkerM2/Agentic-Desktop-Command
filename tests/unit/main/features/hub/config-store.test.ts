/**
 * Unit tests for hub-config-store schema v2 migration.
 *
 * Covers:
 *  - Empty load returns { version: 2, hubs: [], activeHubId: null }
 *  - Legacy v1 blob is migrated to v2 on load and rewritten to disk
 *  - v2 blob round-trips unchanged
 *  - saveConfigV2 persists and reloads cleanly
 *  - Legacy credentials (lastKnownUrl, encryptedApiKey) are preserved
 *  - Backward-compat loadConfig/saveConfig wrappers still operate on
 *    the active hub.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AdcDatabase } from '@main/db';
import * as schema from '@main/db/schema';
import {
  createHubConfigStore,
  migrateV1ToV2,
} from '@main/features/hub/hub-config-store';
import type {
  HubConfigV2,
  PersistedHubConfig,
} from '@main/features/hub/hub-config-store';

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

/** Directly seed the settings_kv row with an arbitrary JSON blob. */
function seedConfig(db: AdcDatabase, blob: unknown): void {
  db.insert(schema.settingsKv)
    .values({
      id: 'seed',
      key: 'default',
      category: 'hub',
      settings: blob,
      updatedAt: new Date().toISOString(),
    })
    .run();
}

/** Read back the raw stored blob. */
function readRawConfig(db: AdcDatabase): unknown {
  const rows = db.select().from(schema.settingsKv).all();
  if (rows.length === 0) return null;
  return rows[0].settings;
}

// ── Test fixtures ──────────────────────────────────────────────────

let db: AdcDatabase;
let dataDir: string;

beforeEach(() => {
  db = createTestDb();
  dataDir = mkdtempSync(join(tmpdir(), 'hub-config-test-'));
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

// ── Specs ──────────────────────────────────────────────────────────

describe('hub-config-store — v2 schema', () => {
  it('returns empty v2 shape when no config is persisted', () => {
    const store = createHubConfigStore(db, dataDir);
    const v2 = store.loadConfigV2();
    expect(v2).toEqual({ version: 2, hubs: [], activeHubId: null });
  });

  it('migrates a legacy v1 blob to v2 on load', () => {
    const legacy: PersistedHubConfig = {
      hubUrl: 'https://hub.example.com:5173',
      encryptedApiKey: 'enc:sekret',
      enabled: true,
      lastConnected: '2026-04-20T10:00:00.000Z',
    };
    seedConfig(db, legacy);

    const store = createHubConfigStore(db, dataDir);
    const v2 = store.loadConfigV2();

    expect(v2.version).toBe(2);
    expect(v2.activeHubId).toBe('legacy');
    expect(v2.hubs).toHaveLength(1);

    const [record] = v2.hubs;
    expect(record.hubId).toBe('legacy');
    expect(record.lastKnownUrl).toBe('https://hub.example.com:5173');
    expect(record.encryptedApiKey).toBe('enc:sekret');
    expect(record.pinnedFingerprint).toBeNull();
    expect(record.clientIdentityRef).toBeNull();
    expect(record.dbPath).toBe('hubs/legacy/adc.db');
    expect(record.lastConnectedAt).toBe('2026-04-20T10:00:00.000Z');
    expect(record.addedAt).toBe('2026-04-20T10:00:00.000Z');
    expect(record.displayName).toContain('Legacy');
  });

  it('rewrites the migrated blob back to disk and subsequent loads return v2 as-is', () => {
    const legacy: PersistedHubConfig = {
      hubUrl: 'https://hub.local:5173',
      encryptedApiKey: 'enc:abc',
      enabled: true,
    };
    seedConfig(db, legacy);

    const store = createHubConfigStore(db, dataDir);
    const firstLoad = store.loadConfigV2();

    // Stored blob should now be v2.
    const raw = readRawConfig(db);
    expect(raw).toMatchObject({ version: 2, activeHubId: 'legacy' });

    // Second load must be a no-op (still v2, same content).
    const secondLoad = store.loadConfigV2();
    expect(secondLoad).toEqual(firstLoad);
  });

  it('leaves an existing v2 blob untouched', () => {
    const v2: HubConfigV2 = {
      version: 2,
      hubs: [
        {
          hubId: 'hub-a',
          displayName: 'Primary',
          lastKnownUrl: 'https://a.example:5173',
          encryptedApiKey: 'enc:key-a',
          pinnedFingerprint: 'sha256:aa',
          dbPath: 'hubs/hub-a/adc.db',
          clientIdentityRef: 'ref-a',
          addedAt: '2026-04-22T12:00:00.000Z',
          lastConnectedAt: '2026-04-22T12:30:00.000Z',
        },
      ],
      activeHubId: 'hub-a',
    };
    seedConfig(db, v2);

    const store = createHubConfigStore(db, dataDir);
    const loaded = store.loadConfigV2();
    expect(loaded).toEqual(v2);
  });

  it('saveConfigV2 writes and subsequent load returns the same shape', () => {
    const store = createHubConfigStore(db, dataDir);
    const config: HubConfigV2 = {
      version: 2,
      hubs: [
        {
          hubId: 'hub-x',
          displayName: 'X',
          lastKnownUrl: 'https://x.example:5173',
          encryptedApiKey: 'enc:x',
          pinnedFingerprint: null,
          dbPath: 'hubs/hub-x/adc.db',
          clientIdentityRef: null,
          addedAt: '2026-04-23T00:00:00.000Z',
          lastConnectedAt: null,
        },
      ],
      activeHubId: 'hub-x',
    };
    store.saveConfigV2(config);
    expect(store.loadConfigV2()).toEqual(config);
  });

  it('migrateV1ToV2 preserves legacy credentials exactly', () => {
    const legacy: PersistedHubConfig = {
      hubUrl: 'https://my-hub.dev:9999',
      encryptedApiKey: 'enc:payload',
      enabled: true,
      lastConnected: '2026-04-01T00:00:00.000Z',
    };
    const v2 = migrateV1ToV2(legacy);
    const [record] = v2.hubs;
    expect(record.lastKnownUrl).toBe(legacy.hubUrl);
    expect(record.encryptedApiKey).toBe(legacy.encryptedApiKey);
    expect(record.addedAt).toBe(legacy.lastConnected);
    expect(record.lastConnectedAt).toBe(legacy.lastConnected);
    expect(v2.activeHubId).toBe('legacy');
  });
});

describe('hub-config-store — backward-compat wrappers', () => {
  it('loadConfig returns null when no active hub exists', () => {
    const store = createHubConfigStore(db, dataDir);
    expect(store.loadConfig()).toBeNull();
  });

  it('loadConfig reflects the active hub after v1→v2 migration', () => {
    const legacy: PersistedHubConfig = {
      hubUrl: 'https://legacy.example:5173',
      encryptedApiKey: 'enc:legacy',
      enabled: true,
      lastConnected: '2026-04-20T10:00:00.000Z',
    };
    seedConfig(db, legacy);

    const store = createHubConfigStore(db, dataDir);
    const compat = store.loadConfig();
    expect(compat).not.toBeNull();
    expect(compat?.hubUrl).toBe(legacy.hubUrl);
    expect(compat?.encryptedApiKey).toBe(legacy.encryptedApiKey);
    expect(compat?.lastConnected).toBe(legacy.lastConnected);
    expect(compat?.enabled).toBe(true);
  });

  it('saveConfig updates the active hub record in v2 storage', () => {
    const store = createHubConfigStore(db, dataDir);
    const cfg: PersistedHubConfig = {
      hubUrl: 'https://fresh.example:5173',
      encryptedApiKey: 'enc:fresh',
      enabled: true,
      lastConnected: '2026-04-23T08:00:00.000Z',
    };
    store.saveConfig(cfg);

    const v2 = store.loadConfigV2();
    expect(v2.activeHubId).toBe('legacy');
    expect(v2.hubs).toHaveLength(1);
    expect(v2.hubs[0].lastKnownUrl).toBe(cfg.hubUrl);
    expect(v2.hubs[0].encryptedApiKey).toBe(cfg.encryptedApiKey);
  });

  it('deleteConfig clears the stored blob', () => {
    const store = createHubConfigStore(db, dataDir);
    store.saveConfig({
      hubUrl: 'https://x.example:5173',
      encryptedApiKey: 'enc:x',
      enabled: true,
    });
    store.deleteConfig();
    expect(readRawConfig(db)).toBeNull();
    expect(store.loadConfigV2()).toEqual({ version: 2, hubs: [], activeHubId: null });
  });
});
