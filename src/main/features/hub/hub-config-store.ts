/**
 * Hub Config Store
 *
 * Encrypted persistence for hub connection configuration backed by SQLite.
 * Uses the `hubConfig` table with a singleton row (key='default').
 * API keys are encrypted via Electron safeStorage (OS credential store).
 *
 * One-time migration from hub-config.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

import { eq } from 'drizzle-orm';

import { hubConfig } from '../../db/schema';
import { hubLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

export interface PersistedHubConfig {
  hubUrl: string;
  /** Base64-encoded encrypted API key. */
  encryptedApiKey: string;
  enabled: boolean;
  lastConnected?: string;
}

const SINGLETON_KEY = 'default';

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

// ── JSON migration (one-time) ──────────────────────────────────────

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db
    .select()
    .from(hubConfig)
    .where(eq(hubConfig.key, SINGLETON_KEY))
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

    db.insert(hubConfig)
      .values({
        key: SINGLETON_KEY,
        hubUrl: parsed.hubUrl,
        encryptedApiKey: parsed.encryptedApiKey,
        enabled: parsed.enabled ?? true,
        lastConnected: parsed.lastConnected ?? null,
        updatedAt: new Date().toISOString(),
      })
      .run();

    hubLogger.info('[Hub] Migrated hub config from JSON to SQLite');
  } catch (err) {
    hubLogger.error('[Hub] Failed to migrate hub config from JSON:', err);
  }
}

// ── SQLite-backed CRUD ─────────────────────────────────────────────

export interface HubConfigStore {
  loadConfig: () => PersistedHubConfig | null;
  saveConfig: (config: PersistedHubConfig) => void;
  deleteConfig: () => void;
}

export function createHubConfigStore(db: AdcDatabase, dataDir: string): HubConfigStore {
  // One-time migration from legacy JSON
  migrateFromJson(db, dataDir);

  function loadConfig(): PersistedHubConfig | null {
    const row = db
      .select()
      .from(hubConfig)
      .where(eq(hubConfig.key, SINGLETON_KEY))
      .get();

    if (!row) return null;

    return {
      hubUrl: row.hubUrl,
      encryptedApiKey: row.encryptedApiKey,
      enabled: row.enabled,
      lastConnected: row.lastConnected ?? undefined,
    };
  }

  function saveConfig(config: PersistedHubConfig): void {
    db.insert(hubConfig)
      .values({
        key: SINGLETON_KEY,
        hubUrl: config.hubUrl,
        encryptedApiKey: config.encryptedApiKey,
        enabled: config.enabled,
        lastConnected: config.lastConnected ?? null,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: hubConfig.key,
        set: {
          hubUrl: config.hubUrl,
          encryptedApiKey: config.encryptedApiKey,
          enabled: config.enabled,
          lastConnected: config.lastConnected ?? null,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  function deleteConfig(): void {
    db.delete(hubConfig)
      .where(eq(hubConfig.key, SINGLETON_KEY))
      .run();
  }

  return { loadConfig, saveConfig, deleteConfig };
}
