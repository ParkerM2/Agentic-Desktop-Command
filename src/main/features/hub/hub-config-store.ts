/**
 * Hub Config Store
 *
 * Encrypted persistence for hub connection configuration backed by SQLite.
 * Uses the `settings_kv` table with category='hub' and key='default'.
 * API keys are encrypted via Electron safeStorage (OS credential store).
 *
 * Schema evolution:
 *  - v1 (legacy): { hubUrl, encryptedApiKey, enabled, lastConnected } — top-level singleton
 *  - v2 (current): { version: 2, hubs: PersistedHubRecord[], activeHubId: string | null }
 *
 * On load, a v1 blob is migrated in place to v2 as a single 'legacy'
 * HubRecord and rewritten. A one-time migration from `hub-config.json`
 * (used by pre-SQLite builds) runs first and writes the legacy shape,
 * which then triggers the v1→v2 upgrader on the next read.
 *
 * Backward-compatibility wrappers (`loadConfig` / `saveConfig` /
 * `deleteConfig`) operate on the ACTIVE hub's record so callers that
 * still expect the v1 singleton shape keep working until Task 23
 * refactors them to the hubs[] API.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

import { and, eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';

import { settingsKv } from '../../db/schema';
import { hubLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

// ── Types ──────────────────────────────────────────────────────────

/**
 * Persisted shape of a single hub record (schema v2).
 * Superset of the IPC `hubRecordSchema` — includes main-process-only
 * fields (encrypted key, db path, identity ref) that never leave main.
 */
export interface PersistedHubRecord {
  hubId: string;
  displayName: string;
  lastKnownUrl: string | null;
  /** Base64-encoded encrypted API key. */
  encryptedApiKey: string;
  pinnedFingerprint: string | null;
  /** Relative path under userData, e.g. 'hubs/legacy/adc.db'. */
  dbPath: string;
  /** Populated by Task 18's client-identity service. */
  clientIdentityRef: string | null;
  addedAt: string;
  lastConnectedAt: string | null;
}

/** v2 persisted blob. */
export interface HubConfigV2 {
  version: 2;
  hubs: PersistedHubRecord[];
  activeHubId: string | null;
}

/**
 * Legacy v1 singleton shape. Retained as an exported type for existing
 * callers (hub-connection, hub-event-mapper) that have not been moved
 * to the hubs[] API yet. New code should use {@link HubConfigV2}.
 */
export interface PersistedHubConfig {
  hubUrl: string;
  /** Base64-encoded encrypted API key. */
  encryptedApiKey: string;
  enabled: boolean;
  lastConnected?: string;
}

const SINGLETON_KEY = 'default';
const CATEGORY = 'hub';
const LEGACY_HUB_ID = 'legacy';
const CURRENT_VERSION = 2 as const;

// ── Encryption helpers (unchanged — still use safeStorage) ─────────

export function encryptApiKey(apiKey: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  }
  // Fallback: base64 encoding (not truly secure, but functional)
  return Buffer.from(apiKey, 'utf-8').toString('base64');
}

export function decryptApiKey(encoded: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encoded, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

// ── JSON → SQLite migration (one-time, pre-v2) ─────────────────────

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db
    .select()
    .from(settingsKv)
    .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
    .get();
  if (existing) return;

  const jsonPath = join(dataDir, 'hub-config.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedHubConfig>;

    if (!parsed.hubUrl || !parsed.encryptedApiKey) {
      hubLogger.warn('[Hub] Legacy hub-config.json missing required fields, skipping migration');
      return;
    }

    const config: PersistedHubConfig = {
      hubUrl: parsed.hubUrl,
      encryptedApiKey: parsed.encryptedApiKey,
      enabled: parsed.enabled ?? true,
      lastConnected: parsed.lastConnected,
    };

    db.insert(settingsKv)
      .values({
        id: generateId(),
        key: SINGLETON_KEY,
        category: CATEGORY,
        settings: config as unknown,
        updatedAt: new Date().toISOString(),
      })
      .run();

    hubLogger.info('[Hub] Migrated hub config from JSON to SQLite');
  } catch (err) {
    hubLogger.error('[Hub] Failed to migrate hub config from JSON:', err);
  }
}

// ── v1 → v2 in-place migration ─────────────────────────────────────

function isV2Blob(value: unknown): value is HubConfigV2 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.version === CURRENT_VERSION && Array.isArray(v.hubs);
}

function isV1Blob(value: unknown): value is PersistedHubConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.hubUrl === 'string' && typeof v.encryptedApiKey === 'string';
}

function deriveDisplayName(hubUrl: string): string {
  try {
    const {host} = new URL(hubUrl);
    return host ? `Legacy (${host})` : 'Legacy Hub';
  } catch {
    return 'Legacy Hub';
  }
}

export function migrateV1ToV2(legacy: PersistedHubConfig): HubConfigV2 {
  const now = new Date().toISOString();
  const record: PersistedHubRecord = {
    hubId: LEGACY_HUB_ID,
    displayName: deriveDisplayName(legacy.hubUrl),
    lastKnownUrl: legacy.hubUrl,
    encryptedApiKey: legacy.encryptedApiKey,
    pinnedFingerprint: null,
    dbPath: `hubs/${LEGACY_HUB_ID}/adc.db`,
    clientIdentityRef: null,
    addedAt: legacy.lastConnected ?? now,
    lastConnectedAt: legacy.lastConnected ?? null,
  };
  return {
    version: CURRENT_VERSION,
    hubs: [record],
    activeHubId: LEGACY_HUB_ID,
  };
}

function emptyV2(): HubConfigV2 {
  return { version: CURRENT_VERSION, hubs: [], activeHubId: null };
}

// ── Store ──────────────────────────────────────────────────────────

export interface HubConfigStore {
  // Legacy API — operates on the active hub. Kept until Task 23.
  loadConfig: () => PersistedHubConfig | null;
  saveConfig: (config: PersistedHubConfig) => void;
  deleteConfig: () => void;

  // v2 API — hubs[] aware.
  loadConfigV2: () => HubConfigV2;
  saveConfigV2: (config: HubConfigV2) => void;
}

export function createHubConfigStore(db: AdcDatabase, dataDir: string): HubConfigStore {
  // One-time migration from legacy JSON file (produces v1 blob).
  migrateFromJson(db, dataDir);

  function readRaw(): unknown {
    const row = db
      .select()
      .from(settingsKv)
      .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
      .get();
    return row ? (row.settings) : null;
  }

  function writeRaw(value: unknown): void {
    db.insert(settingsKv)
      .values({
        id: generateId(),
        key: SINGLETON_KEY,
        category: CATEGORY,
        settings: value,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: settingsKv.key,
        set: {
          settings: value,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  function loadConfigV2(): HubConfigV2 {
    const raw = readRaw();
    if (raw === null) {
      return emptyV2();
    }
    if (isV2Blob(raw)) {
      return raw;
    }
    if (isV1Blob(raw)) {
      const migrated = migrateV1ToV2(raw);
      writeRaw(migrated);
      hubLogger.info('[Hub] Migrated hub config v1 → v2 (legacy hub record)');
      return migrated;
    }
    hubLogger.warn('[Hub] Unrecognised hub config blob — treating as empty');
    return emptyV2();
  }

  function saveConfigV2(config: HubConfigV2): void {
    writeRaw(config);
  }

  function getActiveRecord(config: HubConfigV2): PersistedHubRecord | null {
    if (!config.activeHubId) return null;
    return config.hubs.find((h) => h.hubId === config.activeHubId) ?? null;
  }

  // ── Backward-compat wrappers (active hub) ────────────────────────

  function loadConfig(): PersistedHubConfig | null {
    const v2 = loadConfigV2();
    const active = getActiveRecord(v2);
    if (!active?.lastKnownUrl) return null;
    return {
      hubUrl: active.lastKnownUrl,
      encryptedApiKey: active.encryptedApiKey,
      // Legacy "enabled" flag is implied by having an active hub.
      enabled: true,
      lastConnected: active.lastConnectedAt ?? undefined,
    };
  }

  function saveConfig(config: PersistedHubConfig): void {
    const current = loadConfigV2();
    const now = new Date().toISOString();
    const activeId = current.activeHubId ?? LEGACY_HUB_ID;
    const existing = current.hubs.find((h) => h.hubId === activeId);
    const updatedRecord: PersistedHubRecord = existing
      ? {
          ...existing,
          lastKnownUrl: config.hubUrl,
          encryptedApiKey: config.encryptedApiKey,
          lastConnectedAt: config.lastConnected ?? existing.lastConnectedAt,
        }
      : {
          hubId: activeId,
          displayName: deriveDisplayName(config.hubUrl),
          lastKnownUrl: config.hubUrl,
          encryptedApiKey: config.encryptedApiKey,
          pinnedFingerprint: null,
          dbPath: `hubs/${activeId}/adc.db`,
          clientIdentityRef: null,
          addedAt: config.lastConnected ?? now,
          lastConnectedAt: config.lastConnected ?? null,
        };
    const nextHubs = existing
      ? current.hubs.map((h) => (h.hubId === activeId ? updatedRecord : h))
      : [...current.hubs, updatedRecord];
    const next: HubConfigV2 = {
      version: CURRENT_VERSION,
      hubs: nextHubs,
      activeHubId: activeId,
    };
    writeRaw(next);
  }

  function deleteConfig(): void {
    db.delete(settingsKv)
      .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
      .run();
  }

  return { loadConfig, saveConfig, deleteConfig, loadConfigV2, saveConfigV2 };
}
