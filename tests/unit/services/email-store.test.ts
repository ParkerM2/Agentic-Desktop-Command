/**
 * Unit Tests for EmailStore
 *
 * Tests load/save of email configuration and queue persistence,
 * including password migration detection and encryption.
 * Mocks node:fs, node:path, electron, and email-encryption.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

import type { QueuedEmail } from '@shared/types';

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

// ── Mock encryptSecret ──────────────────────────────────────────────

const mockEncryptSecret = vi.fn((value: string) => ({
  encrypted: Buffer.from(value, 'utf-8').toString('base64'),
  useSafeStorage: false,
}));

vi.mock('@main/services/email/email-encryption', () => ({
  encryptSecret: mockEncryptSecret,
}));

// Import after mocks are set up
const { loadEmailStore, saveEmailStore } = await import(
  '@main/services/email/email-store'
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

// app.getPath('userData') returns '/mock/userData' from electron mock
const EMAIL_FILE = posix.join('/mock/userData', 'email-config.json');

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

function makeQueuedEmail(overrides: Record<string, unknown> = {}): QueuedEmail {
  return {
    id: 'q-1',
    email: {
      to: ['user@example.com'],
      subject: 'Test',
      body: 'Hello',
    },
    status: 'queued',
    attempts: 0,
    createdAt: '2026-02-19T00:00:00.000Z',
    ...overrides,
  } as QueuedEmail;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('EmailStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  // ── loadEmailStore() ──────────────────────────────────────────────

  describe('loadEmailStore()', () => {
    it('returns default empty data when file does not exist', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const result = loadEmailStore();

      expect(result.data).toEqual({ config: null, queue: [] });
      expect(result.needsMigration).toBe(false);
    });

    it('loads valid config and queue from disk', () => {
      const config = makeConfig();
      const queue = [makeQueuedEmail()];

      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config, queue }),
      });

      const result = loadEmailStore();

      expect(result.data.config).toEqual(config);
      expect(result.data.queue).toHaveLength(1);
      expect(result.data.queue[0]?.id).toBe('q-1');
      expect(result.needsMigration).toBe(false);
    });

    it('detects plaintext password needing migration', () => {
      const config = makeConfig({ pass: 'plaintextpassword' });

      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config, queue: [] }),
      });

      const result = loadEmailStore();

      expect(result.needsMigration).toBe(true);
      expect(result.data.config?.pass).toBe('plaintextpassword');
    });

    it('does not flag migration for encrypted password object', () => {
      const config = makeConfig({
        pass: { encrypted: 'abc123', useSafeStorage: true },
      });

      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config, queue: [] }),
      });

      const result = loadEmailStore();

      expect(result.needsMigration).toBe(false);
    });

    it('does not flag migration for empty string password', () => {
      const config = makeConfig({ pass: '' });

      resetFs({
        [EMAIL_FILE]: JSON.stringify({ config, queue: [] }),
      });

      const result = loadEmailStore();

      expect(result.needsMigration).toBe(false);
    });

    it('returns default data when file contains invalid JSON', () => {
      resetFs({
        [EMAIL_FILE]: 'this is not valid json {{{',
      });

      const result = loadEmailStore();

      expect(result.data).toEqual({ config: null, queue: [] });
      expect(result.needsMigration).toBe(false);
    });

    it('returns default data when file contains non-object JSON', () => {
      resetFs({
        [EMAIL_FILE]: '"just a string"',
      });

      const result = loadEmailStore();

      // Parsed as non-object — config would be undefined → needsMigration false
      expect(result.needsMigration).toBe(false);
    });
  });

  // ── saveEmailStore() ──────────────────────────────────────────────

  describe('saveEmailStore()', () => {
    it('writes config and queue to disk', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const config = makeConfig();
      saveEmailStore({ config: config as never, queue: [] });

      const raw = vol.readFileSync(EMAIL_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.config).toBeTruthy();
      expect(parsed.queue).toEqual([]);
    });

    it('encrypts plaintext password on save', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const config = makeConfig({ pass: 'mysecretpass' });
      saveEmailStore({ config: config as never, queue: [] });

      expect(mockEncryptSecret).toHaveBeenCalledWith('mysecretpass');

      const raw = vol.readFileSync(EMAIL_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.config.pass).toEqual(
        expect.objectContaining({
          encrypted: expect.any(String),
          useSafeStorage: expect.any(Boolean),
        }),
      );
    });

    it('preserves already-encrypted password on save', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const encryptedPass = { encrypted: 'abc123', useSafeStorage: true };
      const config = makeConfig({ pass: encryptedPass });
      saveEmailStore({ config: config as never, queue: [] });

      // Should NOT call encryptSecret for already-encrypted pass
      expect(mockEncryptSecret).not.toHaveBeenCalled();

      const raw = vol.readFileSync(EMAIL_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.config.pass).toEqual(encryptedPass);
    });

    it('does not encrypt empty string password', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const config = makeConfig({ pass: '' });
      saveEmailStore({ config: config as never, queue: [] });

      expect(mockEncryptSecret).not.toHaveBeenCalled();
    });

    it('saves null config correctly', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveEmailStore({ config: null, queue: [] });

      const raw = vol.readFileSync(EMAIL_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.config).toBeNull();
      expect(parsed.queue).toEqual([]);
    });

    it('saves queue items to disk', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const queue = [makeQueuedEmail(), makeQueuedEmail({ id: 'q-2' })];
      saveEmailStore({ config: null, queue });

      const raw = vol.readFileSync(EMAIL_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.queue).toHaveLength(2);
      expect(parsed.queue[0].id).toBe('q-1');
      expect(parsed.queue[1].id).toBe('q-2');
    });

    it('creates directory if it does not exist', () => {
      const vol = getMockVol();
      // Do NOT create /mock/userData — saveEmailStore should create it
      expect(vol.existsSync('/mock/userData')).toBe(false);

      saveEmailStore({ config: null, queue: [] });

      expect(vol.existsSync('/mock/userData')).toBe(true);
    });

    it('writes pretty-printed JSON with 2-space indentation', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      saveEmailStore({ config: null, queue: [] });

      const raw = vol.readFileSync(EMAIL_FILE, 'utf-8') as string;

      expect(raw).toContain('\n');
      expect(raw).toBe(JSON.stringify({ config: null, queue: [] }, null, 2));
    });
  });

  // ── Round-trip ────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('data survives save then load', () => {
      const vol = getMockVol();
      vol.mkdirSync('/mock/userData', { recursive: true });

      const encryptedPass = { encrypted: 'abc123', useSafeStorage: true };
      const config = makeConfig({ pass: encryptedPass });
      const queue = [makeQueuedEmail()];

      saveEmailStore({ config: config as never, queue });
      const result = loadEmailStore();

      expect(result.data.config?.host).toBe('smtp.example.com');
      expect(result.data.config?.pass).toEqual(encryptedPass);
      expect(result.data.queue).toHaveLength(1);
      expect(result.data.queue[0]?.id).toBe('q-1');
    });
  });
});
