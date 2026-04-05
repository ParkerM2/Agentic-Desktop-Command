/**
 * Unit Tests for VoiceService
 *
 * Tests getConfig, updateConfig, checkPermission.
 * Mocks node:fs with memfs, electron's app and systemPreferences.
 */

import { posix } from 'node:path';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
  };
});

// ── File System Mocking ───────────────────────────────────────

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

// ── Electron Mocking ──────────────────────────────────────────

const mockGetPath = vi.fn().mockReturnValue('/mock/userData');
const mockGetMediaAccessStatus = vi.fn().mockReturnValue('granted');

vi.mock('electron', () => ({
  app: { getPath: mockGetPath },
  systemPreferences: { getMediaAccessStatus: mockGetMediaAccessStatus },
}));

const { createVoiceService } = await import(
  '@main/services/voice/voice-service'
);

// ── Helpers ───────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const p = filePath.replace(/\\/g, '/');
    const dir = p.substring(0, p.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(p, content, { encoding: 'utf-8' });
  }
}

const CONFIG_FILE = '/mock/userData/voice-config.json';

// ── Tests ─────────────────────────────────────────────────────

describe('VoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPath.mockReturnValue('/mock/userData');
    resetFs();
  });

  describe('getConfig()', () => {
    it('returns default config when no file exists', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.language).toBe('en-US');
      expect(config.inputMode).toBe('push_to_talk');
    });

    it('loads config from existing file', () => {
      resetFs({
        [CONFIG_FILE]: JSON.stringify({
          config: { enabled: true, language: 'fr-FR', inputMode: 'continuous' },
        }),
      });

      const service = createVoiceService();
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.language).toBe('fr-FR');
      expect(config.inputMode).toBe('continuous');
    });

    it('returns default config when file is corrupted', () => {
      resetFs({
        [CONFIG_FILE]: 'this is not json {{{',
      });

      const service = createVoiceService();
      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.language).toBe('en-US');
    });

    it('returns a copy, not a reference', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const c1 = service.getConfig();
      const c2 = service.getConfig();

      expect(c1).not.toBe(c2);
      expect(c1).toEqual(c2);
    });
  });

  describe('updateConfig()', () => {
    it('merges updates into current config', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const updated = service.updateConfig({ enabled: true });

      expect(updated.enabled).toBe(true);
      expect(updated.language).toBe('en-US'); // preserved
    });

    it('persists changes to disk', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      service.updateConfig({ language: 'de-DE' });

      const raw = vol.readFileSync(CONFIG_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw) as { config: { language: string } };
      expect(parsed.config.language).toBe('de-DE');
    });

    it('resets invalid inputMode to push_to_talk', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const updated = service.updateConfig({ inputMode: 'invalid_mode' as never });

      expect(updated.inputMode).toBe('push_to_talk');
    });
  });

  describe('checkPermission()', () => {
    it('returns granted on non-darwin platforms', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const result = service.checkPermission();

      expect(result).toEqual({ granted: true, canRequest: false });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('checks microphone on darwin', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockGetMediaAccessStatus.mockReturnValue('granted');

      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const result = service.checkPermission();

      expect(result).toEqual({ granted: true, canRequest: false });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('reports canRequest when not-determined on darwin', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockGetMediaAccessStatus.mockReturnValue('not-determined');

      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const service = createVoiceService();
      const result = service.checkPermission();

      expect(result).toEqual({ granted: false, canRequest: true });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
