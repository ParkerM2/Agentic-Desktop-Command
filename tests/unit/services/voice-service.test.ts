/**
 * Unit Tests for VoiceService
 *
 * Tests getConfig, updateConfig, checkPermission.
 * Uses an in-memory SQLite db via better-sqlite3 + drizzle.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

// ── Electron Mocking ──────────────────────────────────────────

const mockGetMediaAccessStatus = vi.fn().mockReturnValue('granted');

vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/mock/userData') },
  systemPreferences: { getMediaAccessStatus: mockGetMediaAccessStatus },
}));

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '@main/db/schema';

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings_kv (
      key TEXT PRIMARY KEY,
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

const { createVoiceService } = await import('@main/features/settings/voice/voice-service');

// ── Tests ─────────────────────────────────────────────────────

describe('VoiceService', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createTestDb();
  });

  describe('getConfig()', () => {
    it('returns default config when no row exists', () => {
      const service = createVoiceService({ db });
      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.language).toBe('en-US');
      expect(config.inputMode).toBe('push_to_talk');
    });

    it('loads config from existing row', () => {
      db.insert(schema.settingsKv)
        .values({
          key: 'voice-config',
          settings: { enabled: true, language: 'fr-FR', inputMode: 'continuous' },
          updatedAt: new Date().toISOString(),
        })
        .run();

      const service = createVoiceService({ db });
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.language).toBe('fr-FR');
      expect(config.inputMode).toBe('continuous');
    });

    it('returns a copy, not a reference', () => {
      const service = createVoiceService({ db });
      const c1 = service.getConfig();
      const c2 = service.getConfig();

      expect(c1).not.toBe(c2);
      expect(c1).toEqual(c2);
    });
  });

  describe('updateConfig()', () => {
    it('merges updates into current config', () => {
      const service = createVoiceService({ db });
      const updated = service.updateConfig({ enabled: true });

      expect(updated.enabled).toBe(true);
      expect(updated.language).toBe('en-US'); // preserved
    });

    it('persists changes to db', () => {
      const service = createVoiceService({ db });
      service.updateConfig({ language: 'de-DE' });

      const service2 = createVoiceService({ db });
      const config = service2.getConfig();
      expect(config.language).toBe('de-DE');
    });

    it('resets invalid inputMode to push_to_talk', () => {
      const service = createVoiceService({ db });
      const updated = service.updateConfig({ inputMode: 'invalid_mode' as never });

      expect(updated.inputMode).toBe('push_to_talk');
    });
  });

  describe('checkPermission()', () => {
    it('returns granted on non-darwin platforms', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const service = createVoiceService({ db });
      const result = service.checkPermission();

      expect(result).toEqual({ granted: true, canRequest: false });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('checks microphone on darwin', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockGetMediaAccessStatus.mockReturnValue('granted');

      const service = createVoiceService({ db });
      const result = service.checkPermission();

      expect(result).toEqual({ granted: true, canRequest: false });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('reports canRequest when not-determined on darwin', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockGetMediaAccessStatus.mockReturnValue('not-determined');

      const service = createVoiceService({ db });
      const result = service.checkPermission();

      expect(result).toEqual({ granted: false, canRequest: true });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
