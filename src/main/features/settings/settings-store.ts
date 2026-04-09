/** Settings Store — SQLite-backed persistence for settings + profiles */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import type { AppSettings, Profile } from '@shared/types';

import { profiles, settingsKv } from '../../db/schema';
import { fsLogger } from '../../lib/logger';

import { DEFAULT_PROFILES, DEFAULT_SETTINGS } from './settings-defaults';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedEntry,
  isWebhookSecretKey,
} from './settings-encryption';

import type { SettingsFile } from './settings-defaults';
import type { AdcDatabase } from '../../db';

// ── Helpers ────────────────────────────────────────────────────

/** Encrypt a profile field from migration JSON — handles encrypted entries, plaintext strings, and nulls. */
function encryptProfileField(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isEncryptedEntry(value)) {
    return JSON.stringify(value);
  }
  return typeof value === 'string'
    ? JSON.stringify(encryptSecret(value))
    : null;
}

/** Decrypt an encrypted profile secret column value (JSON string of EncryptedSecretEntry). */
function decryptProfileColumn(
  columnValue: string | null,
): { value: string | undefined; needsMigration: boolean } {
  if (columnValue === null) {
    return { value: undefined, needsMigration: false };
  }
  try {
    const parsed = JSON.parse(columnValue) as unknown;
    if (isEncryptedEntry(parsed)) {
      return { value: decryptSecret(parsed), needsMigration: false };
    }
    // Not an encrypted entry — legacy plaintext stored in DB
    return { value: columnValue, needsMigration: true };
  } catch {
    // Not JSON — treat as plaintext
    return { value: columnValue, needsMigration: true };
  }
}

/** Decrypt a single webhook secret value from the settings blob. */
function decryptWebhookValue(
  key: string,
  value: unknown,
): { decrypted: string; needsMigration: boolean } {
  if (isEncryptedEntry(value)) {
    try {
      return { decrypted: decryptSecret(value), needsMigration: false };
    } catch {
      fsLogger.error(`[Settings] Failed to decrypt ${key}`);
      return { decrypted: '', needsMigration: false };
    }
  }
  if (typeof value === 'string' && value.length > 0) {
    return { decrypted: value, needsMigration: true };
  }
  return { decrypted: '', needsMigration: false };
}

// ── JSON Migration ─────────────────────────────────────────────

/** One-time migration from legacy settings.json into SQLite tables. */
export function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  // Only migrate if settingsKv is empty
  const existing = db.select().from(settingsKv).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'settings.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SettingsFile> & Record<string, unknown>;

    const settingsRaw = (parsed.settings ?? parsed) as Record<string, unknown>;
    const now = new Date().toISOString();

    // Insert settings blob as-is (webhook secrets stay encrypted in JSON)
    db.insert(settingsKv)
      .values({ key: 'default', settings: settingsRaw, updatedAt: now })
      .run();

    // Insert profiles
    const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    for (const p of rawProfiles as unknown as Array<Record<string, unknown>>) {
      const apiKey = encryptProfileField(p.apiKey);
      const oauthToken = encryptProfileField(p.oauthToken);
      const model = typeof p.model === 'string' ? p.model : null;
      const configDir = typeof p.configDir === 'string' ? p.configDir : null;
      const id = typeof p.id === 'string' ? p.id : '';
      const name = typeof p.name === 'string' ? p.name : 'Unknown';

      db.insert(profiles)
        .values({
          id,
          name,
          apiKey,
          model,
          configDir,
          oauthToken,
          isDefault: Boolean(p.isDefault),
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    fsLogger.info(`[Settings] Migrated settings.json to SQLite (${String(rawProfiles.length)} profiles)`);
  } catch (err) {
    fsLogger.error('[Settings] Failed to migrate settings.json:', err);
  }
}

// ── Load ───────────────────────────────────────────────────────

/** Load settings from settingsKv + profiles tables, decrypting secrets. */
export function loadSettingsFile(db: AdcDatabase): { data: SettingsFile; needsMigration: boolean } {
  try {
    // ── Load settings blob ──
    const row = db.select().from(settingsKv).where(eq(settingsKv.key, 'default')).get();

    let settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    let needsMigration = false;

    if (row !== undefined && row.settings !== null) {
      const settingsRaw = row.settings as Record<string, unknown>;
      settings = { ...DEFAULT_SETTINGS };

      for (const [key, value] of Object.entries(settingsRaw)) {
        if (isWebhookSecretKey(key)) {
          const { decrypted, needsMigration: webhookMigration } = decryptWebhookValue(key, value);
          settings[key] = decrypted;
          if (webhookMigration) {
            needsMigration = true;
          }
        } else {
          settings[key] = value;
        }
      }
    }

    // ── Load profiles ──
    const profileRows = db.select().from(profiles).all();

    const loadedProfiles: Profile[] = profileRows.length > 0
      ? profileRows.map((p) => {
        const { value: apiKey, needsMigration: apiKeyMigration } = decryptProfileColumn(p.apiKey);
        const { value: oauthToken, needsMigration: oauthMigration } = decryptProfileColumn(p.oauthToken);

        if (apiKeyMigration || oauthMigration) {
          needsMigration = true;
        }

        return {
          id: p.id,
          name: p.name,
          apiKey,
          model: p.model ?? undefined,
          configDir: p.configDir ?? undefined,
          oauthToken,
          isDefault: p.isDefault,
        };
      })
      : [...DEFAULT_PROFILES];

    return {
      data: { settings: settings as unknown as AppSettings, profiles: loadedProfiles },
      needsMigration,
    };
  } catch {
    return {
      data: { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] },
      needsMigration: false,
    };
  }
}

// ── Save ───────────────────────────────────────────────────────

/** Save settings to settingsKv + profiles tables, encrypting secrets. */
export function saveSettingsFile(db: AdcDatabase, data: SettingsFile): void {
  const now = new Date().toISOString();

  // ── Encrypt webhook secrets in the settings blob ──
  const settingsRaw = data.settings as unknown as Record<string, unknown>;
  const encryptedSettings: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settingsRaw)) {
    encryptedSettings[key] =
      isWebhookSecretKey(key) && typeof value === 'string' && value.length > 0
        ? encryptSecret(value)
        : value;
  }

  // Upsert settings blob
  db.insert(settingsKv)
    .values({ key: 'default', settings: encryptedSettings, updatedAt: now })
    .onConflictDoUpdate({
      target: settingsKv.key,
      set: { settings: encryptedSettings, updatedAt: now },
    })
    .run();

  // ── Upsert all profiles with encrypted secrets ──
  for (const profile of data.profiles) {
    const encApiKey = profile.apiKey
      ? JSON.stringify(encryptSecret(profile.apiKey))
      : null;
    const encOauthToken = profile.oauthToken
      ? JSON.stringify(encryptSecret(profile.oauthToken))
      : null;

    db.insert(profiles)
      .values({
        id: profile.id,
        name: profile.name,
        apiKey: encApiKey,
        model: profile.model ?? null,
        configDir: profile.configDir ?? null,
        oauthToken: encOauthToken,
        isDefault: profile.isDefault,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: profile.name,
          apiKey: encApiKey,
          model: profile.model ?? null,
          configDir: profile.configDir ?? null,
          oauthToken: encOauthToken,
          isDefault: profile.isDefault,
          updatedAt: now,
        },
      })
      .run();
  }

  // ── Remove profiles from DB that are no longer in the in-memory list ──
  const currentIds = new Set(data.profiles.map((p) => p.id));
  const dbProfiles = db.select({ id: profiles.id }).from(profiles).all();
  for (const dbProfile of dbProfiles) {
    if (!currentIds.has(dbProfile.id)) {
      db.delete(profiles).where(eq(profiles.id, dbProfile.id)).run();
    }
  }
}
