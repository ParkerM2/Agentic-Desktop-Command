/**
 * Unit Tests for EmailStore (SQLite-backed)
 *
 * Tests load/save of email configuration persistence,
 * including password migration detection, encryption, and JSON migration.
 * Uses an in-memory SQLite database via better-sqlite3 + Drizzle.
 */

import { posix } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

import * as schema from '@main/db/schema';

import type { AdcDatabase } from '@main/db';

// ── Path Mocking (use posix.join for memfs compatibility on Windows) ──

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
  };
});

// ── File System Mocking (for JSON migration tests) ────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;
  (globalThis as Record<string, unknown>).__mockFs = fs;

  return {
    default: fs,
    ...fs,
  };
});

// ── Mock encryptSecret ──────────────────────────────────────────────

const mockEncryptSecret = vi.fn((value: string) => ({
  encrypted: Buffer.from(value, 'utf-8').toString('base64'),
  useSafeStorage: false,
}));

vi.mock('@main/features/email/email-encryption', () => ({
  encryptSecret: mockEncryptSecret,
}));

// Import after mocks are set up
const { loadEmailConfig, saveEmailConfig, migrateEmailConfigFromJson } = await import(
  '@main/features/email/email-store'
);

// ── Helpers ─────────────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const posixPath = filePath.replace(/\\/g, '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

function createTestDb(): AdcDatabase {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  // Create the settings_kv table (email config now stored here with category='email')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings_kv (
      id TEXT,
      key TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'settings',
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

const DATA_DIR = '/mock/userData';
const EMAIL_FILE = posix.join(DATA_DIR, 'email-config.json');

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'test@example.com',
    pass: { encrypted: 'dGVzdHBhc3M=', useSafeStorage: false },
    from: 'test@example.com',
    provider: 'custom',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('EmailStore (SQLite)', () => {
  let db: AdcDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
    db = createTestDb();
  });

  afterEach(() => {
    resetFs();
  });

  // ── loadEmailConfig() ───────────────────────────────────────────

  describe('loadEmailConfig()', () => {
    it('returns null config when table is empty', () => {
      const result = loadEmailConfig(db);

      expect(result.config).toBeNull();
      expect(result.needsMigration).toBe(false);
    });

    it('loads valid config from SQLite', () => {
      const config = makeConfig();
      saveEmailConfig(db, config as never);

      const result = loadEmailConfig(db);

      expect(result.config?.host).toBe('smtp.example.com');
      expect(result.config?.user).toBe('test@example.com');
      expect(result.needsMigration).toBe(false);
    });

    it('detects plaintext password needing migration', () => {
      // Directly insert a row with plaintext password
      const config = makeConfig({ pass: 'plaintextpassword' });
      // Use raw insert to bypass encryption in saveEmailConfig
      db.insert(schema.settingsKv)
        .values({
          key: 'default',
          category: 'email',
          settings: config as unknown,
          updatedAt: new Date().toISOString(),
        })
        .run();

      const result = loadEmailConfig(db);

      expect(result.needsMigration).toBe(true);
      expect(result.config?.pass).toBe('plaintextpassword');
    });

    it('does not flag migration for encrypted password object', () => {
      const config = makeConfig({
        pass: { encrypted: 'abc123', useSafeStorage: true },
      });

      saveEmailConfig(db, config as never);
      const result = loadEmailConfig(db);

      expect(result.needsMigration).toBe(false);
    });
  });

  // ── saveEmailConfig() ───────────────────────────────────────────

  describe('saveEmailConfig()', () => {
    it('writes config to SQLite', () => {
      const config = makeConfig();
      saveEmailConfig(db, config as never);

      const result = loadEmailConfig(db);
      expect(result.config).toBeTruthy();
      expect(result.config?.host).toBe('smtp.example.com');
    });

    it('encrypts plaintext password on save', () => {
      const config = makeConfig({ pass: 'mysecretpass' });
      saveEmailConfig(db, config as never);

      expect(mockEncryptSecret).toHaveBeenCalledWith('mysecretpass');
    });

    it('preserves already-encrypted password on save', () => {
      const encryptedPass = { encrypted: 'abc123', useSafeStorage: true };
      const config = makeConfig({ pass: encryptedPass });
      saveEmailConfig(db, config as never);

      // Should NOT call encryptSecret for already-encrypted pass
      expect(mockEncryptSecret).not.toHaveBeenCalled();
    });

    it('does not encrypt empty string password', () => {
      const config = makeConfig({ pass: '' });
      saveEmailConfig(db, config as never);

      expect(mockEncryptSecret).not.toHaveBeenCalled();
    });

    it('deletes config when saving null', () => {
      const config = makeConfig();
      saveEmailConfig(db, config as never);

      // Verify config exists
      expect(loadEmailConfig(db).config).toBeTruthy();

      // Save null
      saveEmailConfig(db, null);

      expect(loadEmailConfig(db).config).toBeNull();
    });

    it('upserts config on subsequent saves', () => {
      const config1 = makeConfig({ host: 'smtp1.example.com' });
      saveEmailConfig(db, config1 as never);

      const config2 = makeConfig({ host: 'smtp2.example.com' });
      saveEmailConfig(db, config2 as never);

      const result = loadEmailConfig(db);
      expect(result.config?.host).toBe('smtp2.example.com');
    });
  });

  // ── migrateEmailConfigFromJson() ────────────────────────────────

  describe('migrateEmailConfigFromJson()', () => {
    it('migrates config from JSON file to SQLite', () => {
      const config = makeConfig();
      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config, queue: [] }),
      });

      const migrated = migrateEmailConfigFromJson(db, DATA_DIR);

      expect(migrated).toBe(true);

      const result = loadEmailConfig(db);
      expect(result.config?.host).toBe('smtp.example.com');
    });

    it('does not migrate if SQLite already has config', () => {
      const config = makeConfig({ host: 'existing.example.com' });
      saveEmailConfig(db, config as never);

      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config: makeConfig({ host: 'old.example.com' }), queue: [] }),
      });

      const migrated = migrateEmailConfigFromJson(db, DATA_DIR);

      expect(migrated).toBe(false);
      expect(loadEmailConfig(db).config?.host).toBe('existing.example.com');
    });

    it('does not migrate if JSON file does not exist', () => {
      const migrated = migrateEmailConfigFromJson(db, DATA_DIR);

      expect(migrated).toBe(false);
    });

    it('encrypts plaintext password during migration', () => {
      const config = makeConfig({ pass: 'legacypass' });
      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config, queue: [] }),
      });

      migrateEmailConfigFromJson(db, DATA_DIR);

      expect(mockEncryptSecret).toHaveBeenCalledWith('legacypass');
    });
  });

  // ── Round-trip ────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('data survives save then load', () => {
      const encryptedPass = { encrypted: 'abc123', useSafeStorage: true };
      const config = makeConfig({ pass: encryptedPass });

      saveEmailConfig(db, config as never);
      const result = loadEmailConfig(db);

      expect(result.config?.host).toBe('smtp.example.com');
      expect(result.config?.pass).toEqual(encryptedPass);
    });
  });
});
