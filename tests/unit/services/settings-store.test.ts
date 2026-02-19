/**
 * Unit Tests for Settings Store
 *
 * Tests load, save, encryption integration, corruption recovery,
 * and default values handling.
 * Mocks node:fs with memfs and encryption module for isolation.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking (use posix.join for memfs compatibility on Windows) ──

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
  };
});

// ── File System Mocking ────────────────────────────────────────────

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

vi.mock('@main/services/settings/settings-encryption', () => ({
  encryptSecret: mockEncryptSecret,
  decryptSecret: mockDecryptSecret,
  isEncryptedEntry: mockIsEncryptedEntry,
  isWebhookSecretKey: mockIsWebhookSecretKey,
  isProfileSecretKey: mockIsProfileSecretKey,
}));

// Import after mocks are set up
const { loadSettingsFile, saveSettingsFile } = await import(
  '@main/services/settings/settings-store'
);
const { DEFAULT_SETTINGS, DEFAULT_PROFILES } = await import(
  '@main/services/settings/settings-defaults'
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

// app.getPath('userData') returns '/mock/userData' via the electron mock
const SETTINGS_FILE = posix.join('/mock/userData', 'settings.json');

function makeSettingsFile(overrides: {
  settings?: Record<string, unknown>;
  profiles?: Array<Record<string, unknown>>;
} = {}): string {
  const settings = overrides.settings ?? { ...DEFAULT_SETTINGS };
  const profiles = overrides.profiles ?? [...DEFAULT_PROFILES];
  return JSON.stringify({ settings, profiles }, null, 2);
}

// ── Tests ───────────────────────────────────────────────────────────

describe('SettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  // ── loadSettingsFile() ──────────────────────────────────────────

  describe('loadSettingsFile()', () => {
    it('returns defaults when settings file does not exist', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const result = loadSettingsFile();

      expect(result.data.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.data.profiles).toEqual(DEFAULT_PROFILES);
      expect(result.needsMigration).toBe(false);
    });

    it('reads and parses existing settings file', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        theme: 'dark' as const,
        language: 'fr',
      };

      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: settings as unknown as Record<string, unknown>,
        }),
      });

      const result = loadSettingsFile();

      expect(result.data.settings.theme).toBe('dark');
      expect(result.data.settings.language).toBe('fr');
      expect(result.needsMigration).toBe(false);
    });

    it('decrypts encrypted webhook secrets', () => {
      const encryptedToken = {
        encrypted: Buffer.from('enc:xoxb-slack-token').toString('base64'),
        useSafeStorage: true,
      };

      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: {
            ...DEFAULT_SETTINGS,
            webhookSlackBotToken: encryptedToken,
          } as unknown as Record<string, unknown>,
        }),
      });

      const result = loadSettingsFile();

      expect(mockDecryptSecret).toHaveBeenCalledWith(encryptedToken);
      expect((result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken).toBe(
        'xoxb-slack-token',
      );
    });

    it('marks needsMigration for plaintext webhook secrets', () => {
      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: {
            ...DEFAULT_SETTINGS,
            webhookSlackBotToken: 'plaintext-token',
          } as unknown as Record<string, unknown>,
        }),
      });

      const result = loadSettingsFile();

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

      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: {
            ...DEFAULT_SETTINGS,
            webhookSlackBotToken: encryptedToken,
          } as unknown as Record<string, unknown>,
        }),
      });

      const result = loadSettingsFile();

      expect(
        (result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken,
      ).toBe('');
    });

    it('sets empty string for empty webhook secret values', () => {
      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: {
            ...DEFAULT_SETTINGS,
            webhookSlackBotToken: '',
          } as unknown as Record<string, unknown>,
        }),
      });

      const result = loadSettingsFile();

      expect(
        (result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken,
      ).toBe('');
    });

    it('decrypts encrypted profile secrets', () => {
      const encryptedApiKey = {
        encrypted: Buffer.from('enc:sk-secret-key').toString('base64'),
        useSafeStorage: true,
      };

      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          profiles: [
            { id: 'default', name: 'Default', isDefault: true, apiKey: encryptedApiKey },
          ],
        }),
      });

      const result = loadSettingsFile();

      expect(mockDecryptSecret).toHaveBeenCalled();
      expect(result.data.profiles[0]?.apiKey).toBe('sk-secret-key');
    });

    it('marks needsMigration for plaintext profile secrets', () => {
      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          profiles: [
            { id: 'default', name: 'Default', isDefault: true, apiKey: 'plaintext-key' },
          ],
        }),
      });

      const result = loadSettingsFile();

      expect(result.needsMigration).toBe(true);
    });

    it('sets empty string for profile secret when decryption fails', () => {
      mockDecryptSecret.mockImplementationOnce(() => {
        throw new Error('Profile decryption failed');
      });

      const encryptedKey = {
        encrypted: 'bad-data',
        useSafeStorage: true,
      };

      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          profiles: [
            { id: 'default', name: 'Default', isDefault: true, apiKey: encryptedKey },
          ],
        }),
      });

      const result = loadSettingsFile();

      expect(result.data.profiles[0]?.apiKey).toBe('');
    });

    it('uses default profiles when profiles array is empty', () => {
      resetFs({
        [SETTINGS_FILE]: JSON.stringify({ settings: DEFAULT_SETTINGS, profiles: [] }),
      });

      const result = loadSettingsFile();

      expect(result.data.profiles).toEqual(DEFAULT_PROFILES);
    });

    it('uses default profiles when profiles field is missing', () => {
      resetFs({
        [SETTINGS_FILE]: JSON.stringify({ settings: DEFAULT_SETTINGS }),
      });

      const result = loadSettingsFile();

      expect(result.data.profiles).toEqual(DEFAULT_PROFILES);
    });

    it('returns defaults for corrupted JSON', () => {
      resetFs({
        [SETTINGS_FILE]: 'this is not valid json {{{',
      });

      const result = loadSettingsFile();

      expect(result.data.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.data.profiles).toEqual(DEFAULT_PROFILES);
      expect(result.needsMigration).toBe(false);
    });

    it('handles legacy flat settings format (no settings wrapper)', () => {
      // Old format: settings fields at root level, no "settings" key
      resetFs({
        [SETTINGS_FILE]: JSON.stringify({
          theme: 'dark',
          language: 'es',
          colorTheme: 'ocean',
          uiScale: 110,
          onboardingCompleted: true,
        }),
      });

      const result = loadSettingsFile();

      // When parsed.settings is undefined, it falls through to parsed itself
      expect(result.data.settings.theme).toBe('dark');
      expect(result.data.settings.language).toBe('es');
    });

    it('preserves non-secret settings fields unchanged', () => {
      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: {
            theme: 'light',
            colorTheme: 'ocean',
            language: 'de',
            uiScale: 125,
            onboardingCompleted: true,
          },
        }),
      });

      const result = loadSettingsFile();

      expect(result.data.settings.theme).toBe('light');
      expect(result.data.settings.colorTheme).toBe('ocean');
      expect(result.data.settings.language).toBe('de');
      expect(result.data.settings.uiScale).toBe(125);
      expect(result.data.settings.onboardingCompleted).toBe(true);
    });
  });

  // ── saveSettingsFile() ──────────────────────────────────────────

  describe('saveSettingsFile()', () => {
    it('writes settings file to disk', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS },
        profiles: [...DEFAULT_PROFILES],
      });

      expect(vol.existsSync(SETTINGS_FILE)).toBe(true);
      const content = vol.readFileSync(SETTINGS_FILE, 'utf-8') as string;
      const parsed = JSON.parse(content) as Record<string, unknown>;
      expect(parsed).toHaveProperty('settings');
      expect(parsed).toHaveProperty('profiles');
    });

    it('creates parent directory if it does not exist', () => {
      const vol = getMockVol();
      // Do NOT create /mock/userData — let saveSettingsFile do it
      vol.mkdirSync('/mock', { recursive: true });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS },
        profiles: [...DEFAULT_PROFILES],
      });

      expect(vol.existsSync('/mock/userData')).toBe(true);
      expect(vol.existsSync(SETTINGS_FILE)).toBe(true);
    });

    it('encrypts webhook secret fields', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const settings = {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: 'my-slack-token',
      } as unknown as Record<string, unknown>;

      saveSettingsFile({
        settings: settings as unknown as import('@shared/types').AppSettings,
        profiles: [...DEFAULT_PROFILES],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith('my-slack-token');

      const content = vol.readFileSync(SETTINGS_FILE, 'utf-8') as string;
      const parsed = JSON.parse(content) as { settings: Record<string, unknown> };

      // The webhook field should be an encrypted entry, not plaintext
      const savedToken = parsed.settings.webhookSlackBotToken as Record<string, unknown>;
      expect(savedToken).toHaveProperty('encrypted');
      expect(savedToken).toHaveProperty('useSafeStorage');
    });

    it('does not encrypt empty webhook secrets', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const settings = {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: '',
      } as unknown as Record<string, unknown>;

      saveSettingsFile({
        settings: settings as unknown as import('@shared/types').AppSettings,
        profiles: [...DEFAULT_PROFILES],
      });

      // encryptSecret should not be called for empty strings
      expect(mockEncryptSecret).not.toHaveBeenCalledWith('');
    });

    it('encrypts profile secret fields', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'default', name: 'Default', isDefault: true, apiKey: 'sk-my-api-key' },
        ],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith('sk-my-api-key');

      const content = vol.readFileSync(SETTINGS_FILE, 'utf-8') as string;
      const parsed = JSON.parse(content) as {
        profiles: Array<Record<string, unknown>>;
      };

      const savedApiKey = parsed.profiles[0]?.apiKey as Record<string, unknown>;
      expect(savedApiKey).toHaveProperty('encrypted');
      expect(savedApiKey).toHaveProperty('useSafeStorage');
    });

    it('does not encrypt non-secret profile fields', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'test-id', name: 'Test Profile', isDefault: false, model: 'claude-3' },
        ],
      });

      const content = vol.readFileSync(SETTINGS_FILE, 'utf-8') as string;
      const parsed = JSON.parse(content) as {
        profiles: Array<Record<string, unknown>>;
      };

      expect(parsed.profiles[0]?.name).toBe('Test Profile');
      expect(parsed.profiles[0]?.model).toBe('claude-3');
      expect(parsed.profiles[0]?.id).toBe('test-id');
    });

    it('writes pretty-printed JSON with 2-space indentation', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS },
        profiles: [...DEFAULT_PROFILES],
      });

      const content = vol.readFileSync(SETTINGS_FILE, 'utf-8') as string;
      expect(content).toContain('\n');
      // JSON.stringify with 2-space indent starts with '{\n  '
      expect(content.startsWith('{\n')).toBe(true);
    });

    it('overwrites existing settings file', () => {
      resetFs({
        [SETTINGS_FILE]: makeSettingsFile({
          settings: {
            ...DEFAULT_SETTINGS,
            theme: 'light',
          } as unknown as Record<string, unknown>,
        }),
      });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
        profiles: [...DEFAULT_PROFILES],
      });

      const content = getMockVol().readFileSync(SETTINGS_FILE, 'utf-8') as string;
      const parsed = JSON.parse(content) as { settings: Record<string, unknown> };
      expect(parsed.settings.theme).toBe('dark');
    });
  });

  // ── Round-trip: save → load ────────────────────────────────────

  describe('round-trip (save then load)', () => {
    it('preserves all settings through save and load', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const settings = {
        ...DEFAULT_SETTINGS,
        theme: 'dark' as const,
        colorTheme: 'ocean',
        language: 'ja',
        uiScale: 150,
        onboardingCompleted: true,
      };
      const profiles = [
        { id: 'p1', name: 'Primary', isDefault: true },
        { id: 'p2', name: 'Secondary', isDefault: false, model: 'claude-3' },
      ];

      saveSettingsFile({ settings, profiles });
      const result = loadSettingsFile();

      expect(result.data.settings.theme).toBe('dark');
      expect(result.data.settings.colorTheme).toBe('ocean');
      expect(result.data.settings.language).toBe('ja');
      expect(result.data.settings.uiScale).toBe(150);
      expect(result.data.profiles).toHaveLength(2);
      expect(result.data.profiles[0]?.name).toBe('Primary');
      expect(result.data.profiles[1]?.name).toBe('Secondary');
    });

    it('encrypts on save and decrypts on load for webhook secrets', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const settings = {
        ...DEFAULT_SETTINGS,
        webhookSlackBotToken: 'xoxb-round-trip-token',
      } as unknown as import('@shared/types').AppSettings;

      saveSettingsFile({ settings, profiles: [...DEFAULT_PROFILES] });

      // Verify encryption was called during save
      expect(mockEncryptSecret).toHaveBeenCalledWith('xoxb-round-trip-token');

      const result = loadSettingsFile();

      // Verify decryption was called during load
      expect(mockDecryptSecret).toHaveBeenCalled();
      expect(
        (result.data.settings as unknown as Record<string, unknown>).webhookSlackBotToken,
      ).toBe('xoxb-round-trip-token');
    });

    it('encrypts on save and decrypts on load for profile secrets', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveSettingsFile({
        settings: { ...DEFAULT_SETTINGS },
        profiles: [
          { id: 'default', name: 'Default', isDefault: true, apiKey: 'sk-round-trip' },
        ],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith('sk-round-trip');

      const result = loadSettingsFile();

      expect(mockDecryptSecret).toHaveBeenCalled();
      expect(result.data.profiles[0]?.apiKey).toBe('sk-round-trip');
    });
  });
});
