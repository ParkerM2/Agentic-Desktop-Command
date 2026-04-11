/**
 * Unit Tests for Settings Store (SQLite-backed)
 *
 * Tests load, save, encryption integration, JSON migration,
 * and default values handling.
 * Uses an in-memory SQLite database for isolation.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '@main/db/schema';

import type { AdcDatabase } from '@main/db';
import type { AppSettings } from '@shared/types';

// ── Encryption Mocking ─────────────────────────────────────────────

const mockEncryptSecret = vi.fn((value: string) => ({
  encrypted: Buffer.from(`enc:${value}`).toString('base64'),
  useSafeStorage: true,
}));

const mockDecryptSecret = vi.fn(
  (entry: { encrypted: string; useSafeStorage: boolean }) => {
    const raw = Buffer.from(entry.encrypted, 'base64').toString();
    return raw.replace('enc:', '');
  },
);

const mockIsEncryptedEntry = vi.fn(
  (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return typeof obj.encrypted === 'string' && typeof obj.useSafeStorage === 'boolean';
  },
);

const mockIsWebhookSecretKey = vi.fn(
  (key: string): boolean =>
    ['webhookSlackBotToken', 'webhookSlackSigningSecret', 'webhookGithubSecret'].includes(key),
);

const mockIsProfileSecretKey = vi.fn(
  (key: string): boolean => ['apiKey', 'oauthToken'].includes(key),
);

vi.mock('@main/features/settings/settings-encryption', () => ({
  encryptSecret: mockEncryptSecret,
  decryptSecret: mockDecryptSecret,
  isEncryptedEntry: mockIsEncryptedEntry,
  isWebhookSecretKey: mockIsWebhookSecretKey,
  isProfileSecretKey: mockIsProfileSecretKey,
}));

// ── File System Mocking (for migrateFromJson) ─────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return {
    default: fs,
    ...fs,
  };
});

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
  };
});

// Import after mocks
const { loadSettingsFile, saveSettingsFile, migrateFromJson } = await import(
  '@main/features/settings/settings-store'
);
const { DEFAULT_SETTINGS, DEFAULT_PROFILES } = await import(
  '@main/features/settings/settings-defaults'
);

// ── Helpers ─────────────────────────────────────────────────────────

function createTestDb(): AdcDatabase {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings_kv (
      id TEXT,
      key TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'settings',
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT,
      model TEXT,
      config_dir TEXT,
      oauth_token TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

function seedSettings(db: AdcDatabase, settingsObj: Record<string, unknown>): void {
  db.insert(schema.settingsKv)
    .values({
      key: 'default',
      settings: settingsObj,
      updatedAt: new Date().toISOString(),
    })
    .run();
}

function seedProfile(
  db: AdcDatabase,
  profile: {
    id: string;
    name: string;
    apiKey?: string | null;
    model?: string | null;
    configDir?: string | null;
    oauthToken?: string | null;
    isDefault: boolean;
  },
): void {
  db.insert(schema.profiles)
    .values({
      id: profile.id,
      name: profile.name,
      apiKey: profile.apiKey ?? null,
      model: profile.model ?? null,
      configDir: profile.configDir ?? null,
      oauthToken: profile.oauthToken ?? null,
      isDefault: profile.isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
}

// ── Tests ───────────────────────────────────────────────────────────

describe('SettingsStore (SQLite)', () => {
  let db: AdcDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createTestDb();
  });

  afterEach(() => {
    // in-memory DB is garbage collected
  });

  // ── loadSettingsFile() ──────────────────────────────────────────

  describe('loadSettingsFile()', () => {
    it('returns defaults when tables are empty', () => {
      const result = loadSettingsFile(db);

      expect(result.data.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.data.profiles).toEqual(DEFAULT_PROFILES);
      expect(result.needsMigration).toBe(false);
    });

    it('reads settings from settingsKv table', () => {
      seedSettings(db, {
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        language: 'fr',
      } as unknown as Record<string, unknown>);

      const result = loadSettingsFile(db);

      expect(result.data.settings.theme).toBe('dark');
      expect(result.data.settings.language).toBe('fr');
      expect(result.needsMigration).toBe(false);
    });

    it('decrypts encrypted webhook secrets from settings blob', () => {
      const encryptedToken = {
        encrypted: Buffer.from('enc:xoxb-slack-token').toString('base64'),
        useSafeStorage: true,
      };

      seedSettings(db, {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: encryptedToken,
      } as unknown as Record<string, unknown>);

      const result = loadSettingsFile(db);

      expect(mockDecryptSecret).toHaveBeenCalledWith(encryptedToken);
      expect((result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken).toBe(
        'xoxb-slack-token',
      );
    });

    it('marks needsMigration for plaintext webhook secrets', () => {
      seedSettings(db, {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: 'plaintext-token',
      } as unknown as Record<string, unknown>);

      const result = loadSettingsFile(db);

      expect(result.needsMigration).toBe(true);
      expect(
        (result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken,
      ).toBe('plaintext-token');
    });

    it('sets empty string for webhook secret when decryption fails', () => {
      mockDecryptSecret.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      const encryptedToken = {
        encrypted: 'corrupted-data',
        useSafeStorage: true,
      };

      seedSettings(db, {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: encryptedToken,
      } as unknown as Record<string, unknown>);

      const result = loadSettingsFile(db);

      expect(
        (result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken,
      ).toBe('');
    });

    it('decrypts encrypted profile apiKey', () => {
      const encEntry = mockEncryptSecret('sk-secret-key');
      seedProfile(db, {
        id: 'default',
        name: 'Default',
        apiKey: JSON.stringify(encEntry),
        isDefault: true,
      });

      const result = loadSettingsFile(db);

      expect(mockDecryptSecret).toHaveBeenCalled();
      expect(result.data.profiles[0]?.apiKey).toBe('sk-secret-key');
    });

    it('marks needsMigration for plaintext profile secrets', () => {
      seedProfile(db, {
        id: 'default',
        name: 'Default',
        apiKey: 'plaintext-key',
        isDefault: true,
      });

      const result = loadSettingsFile(db);

      expect(result.needsMigration).toBe(true);
    });

    it('uses default profiles when profiles table is empty', () => {
      seedSettings(db, { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>);

      const result = loadSettingsFile(db);

      expect(result.data.profiles).toEqual(DEFAULT_PROFILES);
    });

    it('preserves non-secret settings fields unchanged', () => {
      seedSettings(db, {
        theme: 'light',
        colorTheme: 'ocean',
        language: 'de',
        uiScale: 125,
        onboardingCompleted: true,
      });

      const result = loadSettingsFile(db);

      expect(result.data.settings.theme).toBe('light');
      expect(result.data.settings.colorTheme).toBe('ocean');
      expect(result.data.settings.language).toBe('de');
      expect(result.data.settings.uiScale).toBe(125);
      expect(result.data.settings.onboardingCompleted).toBe(true);
    });
  });

  // ── saveSettingsFile() ──────────────────────────────────────────

  describe('saveSettingsFile()', () => {
    it('writes settings to settingsKv table', () => {
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [...DEFAULT_PROFILES],
      });

      const row = db.select().from(schema.settingsKv).all();
      expect(row).toHaveLength(1);
      expect(row[0]?.key).toBe('default');
    });

    it('writes profiles to profiles table', () => {
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'p1', name: 'Primary', isDefault: true },
          { id: 'p2', name: 'Secondary', isDefault: false, model: 'claude-3' },
        ],
      });

      const rows = db.select().from(schema.profiles).all();
      expect(rows).toHaveLength(2);
    });

    it('encrypts webhook secret fields', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: 'my-slack-token',
      } as unknown as AppSettings;

      saveSettingsFile(db, {
        settings,
        profiles: [...DEFAULT_PROFILES],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith('my-slack-token');

      const row = db.select().from(schema.settingsKv).all();
      const savedSettings = row[0]?.settings as Record<string, unknown>;
      const savedToken = savedSettings.webhookSlackBotToken as Record<string, unknown>;
      expect(savedToken).toHaveProperty('encrypted');
      expect(savedToken).toHaveProperty('useSafeStorage');
    });

    it('does not encrypt empty webhook secrets', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: '',
      } as unknown as AppSettings;

      saveSettingsFile(db, {
        settings,
        profiles: [...DEFAULT_PROFILES],
      });

      expect(mockEncryptSecret).not.toHaveBeenCalledWith('');
    });

    it('encrypts profile apiKey fields', () => {
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'default', name: 'Default', isDefault: true, apiKey: 'sk-my-api-key' },
        ],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith('sk-my-api-key');

      const rows = db.select().from(schema.profiles).all();
      expect(rows[0]?.apiKey).toBeTruthy();
      const parsed = JSON.parse(rows[0]!.apiKey!) as Record<string, unknown>;
      expect(parsed).toHaveProperty('encrypted');
      expect(parsed).toHaveProperty('useSafeStorage');
    });

    it('removes deleted profiles from DB', () => {
      // First save two profiles
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'p1', name: 'Profile 1', isDefault: true },
          { id: 'p2', name: 'Profile 2', isDefault: false },
        ],
      });

      expect(db.select().from(schema.profiles).all()).toHaveLength(2);

      // Save with only one profile — p2 should be removed
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'p1', name: 'Profile 1', isDefault: true },
        ],
      });

      const rows = db.select().from(schema.profiles).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe('p1');
    });

    it('upserts existing profiles on conflict', () => {
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [{ id: 'p1', name: 'Original', isDefault: true }],
      });

      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [{ id: 'p1', name: 'Updated', isDefault: true }],
      });

      const rows = db.select().from(schema.profiles).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe('Updated');
    });
  });

  // ── Round-trip: save → load ────────────────────────────────────

  describe('round-trip (save then load)', () => {
    it('preserves all settings through save and load', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        theme: 'dark' as const,
        colorTheme: 'ocean',
        language: 'ja',
        uiScale: 150,
        onboardingCompleted: true,
      };
      const profileList = [
        { id: 'p1', name: 'Primary', isDefault: true },
        { id: 'p2', name: 'Secondary', isDefault: false, model: 'claude-3' },
      ];

      saveSettingsFile(db, { settings, profiles: profileList });
      const result = loadSettingsFile(db);

      expect(result.data.settings.theme).toBe('dark');
      expect(result.data.settings.colorTheme).toBe('ocean');
      expect(result.data.settings.language).toBe('ja');
      expect(result.data.settings.uiScale).toBe(150);
      expect(result.data.profiles).toHaveLength(2);
      expect(result.data.profiles[0]?.name).toBe('Primary');
      expect(result.data.profiles[1]?.name).toBe('Secondary');
    });

    it('encrypts on save and decrypts on load for webhook secrets', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: 'xoxb-round-trip-token',
      } as unknown as AppSettings;

      saveSettingsFile(db, { settings, profiles: [...DEFAULT_PROFILES] });

      expect(mockEncryptSecret).toHaveBeenCalledWith('xoxb-round-trip-token');

      const result = loadSettingsFile(db);

      expect(mockDecryptSecret).toHaveBeenCalled();
      expect(
        (result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken,
      ).toBe('xoxb-round-trip-token');
    });

    it('encrypts on save and decrypts on load for profile secrets', () => {
      saveSettingsFile(db, {
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'default', name: 'Default', isDefault: true, apiKey: 'sk-round-trip' },
        ],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith('sk-round-trip');

      const result = loadSettingsFile(db);

      expect(mockDecryptSecret).toHaveBeenCalled();
      expect(result.data.profiles[0]?.apiKey).toBe('sk-round-trip');
    });
  });

  // ── migrateFromJson() ─────────────────────────────────────────

  describe('migrateFromJson()', () => {
    it('does nothing when settingsKv already has data', () => {
      seedSettings(db, { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>);

      // Even if a JSON file existed, migration should be skipped
      migrateFromJson(db, '/nonexistent');

      // Should still have exactly one row
      const rows = db.select().from(schema.settingsKv).all();
      expect(rows).toHaveLength(1);
    });

    it('does nothing when settings.json does not exist', () => {
      migrateFromJson(db, '/nonexistent');

      const rows = db.select().from(schema.settingsKv).all();
      expect(rows).toHaveLength(0);
    });
  });
});
