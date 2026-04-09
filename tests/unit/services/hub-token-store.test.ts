/**
 * Unit Tests — TokenStore (SQLite-backed)
 *
 * Tests the TokenStore implementation that persists encrypted tokens
 * in the `oauth_tokens` SQLite table.
 * Focuses on token encryption, storage, retrieval, and JSON migration.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '@main/db/schema';

import type { OAuthTokens } from '@main/auth/types';
import type { AdcDatabase } from '@main/db';

// ─── Mocks ────────────────────────────────────────────────────────────

// Mock electron safeStorage
const mockSafeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
  decryptString: vi.fn((b: Buffer) => b.toString().replace('enc:', '')),
};

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
}));

// Mock node:fs for JSON migration tests
const mockFs = {
  existsSync: vi.fn((_path: string) => false),
  readFileSync: vi.fn((_path: string, _encoding?: string) => '{}'),
};

vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockFs.existsSync(path),
  readFileSync: (path: string, encoding?: string) => mockFs.readFileSync(path, encoding),
}));

// ─── Constants ────────────────────────────────────────────────────────

const HUB_PROVIDER = 'hub';
const DATA_DIR = '/mock/userData';

// ─── Helpers ──────────────────────────────────────────────────────────

function createTestDb(): AdcDatabase {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Create the oauth_tokens table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT PRIMARY KEY,
      encrypted TEXT NOT NULL,
      use_safe_storage INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);

  return db;
}

// ─── Test Suite ───────────────────────────────────────────────────────

describe('TokenStore (SQLite)', () => {
  let db: AdcDatabase;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();

    // Reset safeStorage mocks to default behavior
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockImplementation((s: string) => Buffer.from(`enc:${s}`));
    mockSafeStorage.decryptString.mockImplementation((b: Buffer) => b.toString().replace('enc:', ''));

    // Default: no JSON file to migrate
    mockFs.existsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to import and create a fresh store (re-imports to clear module cache if needed)
   */
  async function createFreshStore() {
    const { createTokenStore } = await import('@main/auth/token-store');
    return createTokenStore({ db, dataDir: DATA_DIR });
  }

  describe('setTokens()', () => {
    it('stores access and refresh tokens', async () => {
      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: '2026-12-31T23:59:59.000Z',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);

      // Verify tokens can be retrieved
      const retrieved = store.getTokens(HUB_PROVIDER);
      expect(retrieved).toBeDefined();
      expect(retrieved?.accessToken).toBe('test-access-token');
      expect(retrieved?.refreshToken).toBe('test-refresh-token');
      expect(retrieved?.tokenType).toBe('Bearer');
    });

    it('encrypts tokens with safeStorage', async () => {
      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'secret-access-token',
        refreshToken: 'secret-refresh-token',
        expiresAt: '2026-12-31T23:59:59.000Z',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);

      // Verify encryptString was called
      expect(mockSafeStorage.encryptString).toHaveBeenCalled();

      // Verify the row exists in the database
      const row = db.select().from(schema.oauthTokens).all();
      expect(row).toHaveLength(1);
      expect(row[0].provider).toBe(HUB_PROVIDER);
      expect(row[0].useSafeStorage).toBe(true);
      expect(row[0].encrypted).toBeDefined();
    });

    it('falls back to base64 encoding when safeStorage is unavailable', async () => {
      // Make safeStorage unavailable
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'fallback-access-token',
        refreshToken: 'fallback-refresh-token',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);

      // Verify encryptString was NOT called
      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled();

      // Verify the row is stored with useSafeStorage: false
      const row = db.select().from(schema.oauthTokens).all();
      expect(row).toHaveLength(1);
      expect(row[0].useSafeStorage).toBe(false);
    });

    it('upserts when setting tokens for the same provider twice', async () => {
      const store = await createFreshStore();

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'first-token',
        tokenType: 'Bearer',
      });

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'second-token',
        tokenType: 'Bearer',
      });

      // Should still have only one row
      const rows = db.select().from(schema.oauthTokens).all();
      expect(rows).toHaveLength(1);

      // Should return the latest token
      const retrieved = store.getTokens(HUB_PROVIDER);
      expect(retrieved?.accessToken).toBe('second-token');
    });
  });

  describe('getTokens()', () => {
    it('returns stored tokens', async () => {
      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'get-access-token',
        refreshToken: 'get-refresh-token',
        expiresAt: '2026-12-31T23:59:59.000Z',
        tokenType: 'Bearer',
        scope: 'read write',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(retrieved).toBeDefined();
      expect(retrieved?.accessToken).toBe('get-access-token');
      expect(retrieved?.refreshToken).toBe('get-refresh-token');
      expect(retrieved?.expiresAt).toBe('2026-12-31T23:59:59.000Z');
      expect(retrieved?.tokenType).toBe('Bearer');
      expect(retrieved?.scope).toBe('read write');
    });

    it('decrypts tokens correctly', async () => {
      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'encrypted-access-token',
        refreshToken: 'encrypted-refresh-token',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);

      // Verify decryptString is called when retrieving
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(mockSafeStorage.decryptString).toHaveBeenCalled();
      expect(retrieved?.accessToken).toBe('encrypted-access-token');
    });

    it('returns undefined when no tokens exist', async () => {
      const store = await createFreshStore();

      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(retrieved).toBeUndefined();
    });

    it('returns undefined for non-existent provider', async () => {
      const store = await createFreshStore();

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'test-token',
        tokenType: 'Bearer',
      });

      const retrieved = store.getTokens('other-provider');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('deleteTokens()', () => {
    it('removes stored tokens', async () => {
      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'delete-access-token',
        refreshToken: 'delete-refresh-token',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      expect(store.hasTokens(HUB_PROVIDER)).toBe(true);

      store.deleteTokens(HUB_PROVIDER);

      expect(store.hasTokens(HUB_PROVIDER)).toBe(false);
      expect(store.getTokens(HUB_PROVIDER)).toBeUndefined();
    });

    it('persists deletion to database', async () => {
      const store = await createFreshStore();

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'persist-delete-token',
        tokenType: 'Bearer',
      });

      store.deleteTokens(HUB_PROVIDER);

      // Verify the row no longer exists
      const rows = db.select().from(schema.oauthTokens).all();
      expect(rows).toHaveLength(0);
    });
  });

  describe('hasTokens()', () => {
    it('returns true when tokens exist', async () => {
      const store = await createFreshStore();

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'has-token',
        tokenType: 'Bearer',
      });

      expect(store.hasTokens(HUB_PROVIDER)).toBe(true);
    });

    it('returns false when no tokens exist', async () => {
      const store = await createFreshStore();

      expect(store.hasTokens(HUB_PROVIDER)).toBe(false);
    });

    it('returns false after tokens are deleted', async () => {
      const store = await createFreshStore();

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'temp-token',
        tokenType: 'Bearer',
      });

      store.deleteTokens(HUB_PROVIDER);

      expect(store.hasTokens(HUB_PROVIDER)).toBe(false);
    });
  });

  describe('Token Expiry Checking', () => {
    function isTokenExpired(tokens: OAuthTokens | undefined): boolean {
      if (!tokens?.expiresAt) return true;
      const expiresAtDate = new Date(tokens.expiresAt);
      return expiresAtDate.getTime() <= Date.now();
    }

    function getAccessTokenIfValid(tokens: OAuthTokens | undefined): string | null {
      if (!tokens?.accessToken) return null;
      if (isTokenExpired(tokens)) return null;
      return tokens.accessToken;
    }

    it('isExpired returns true for expired tokens', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-01-01T00:00:00.000Z',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(isTokenExpired(retrieved)).toBe(true);
    });

    it('isExpired returns false for valid tokens', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-12-31T23:59:59.000Z',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(isTokenExpired(retrieved)).toBe(false);
    });

    it('isExpired returns true when expiresAt is missing', async () => {
      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'no-expiry-token',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(isTokenExpired(retrieved)).toBe(true);
    });

    it('getAccessToken returns token if valid', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'my-valid-access-token',
        expiresAt: '2026-12-31T23:59:59.000Z',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(getAccessTokenIfValid(retrieved)).toBe('my-valid-access-token');
    });

    it('getAccessToken returns null if expired', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

      const store = await createFreshStore();

      const tokens: OAuthTokens = {
        accessToken: 'my-expired-access-token',
        expiresAt: '2026-01-01T00:00:00.000Z',
        tokenType: 'Bearer',
      };

      store.setTokens(HUB_PROVIDER, tokens);
      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(getAccessTokenIfValid(retrieved)).toBeNull();
    });

    it('getAccessToken returns null when no tokens exist', async () => {
      const store = await createFreshStore();

      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(getAccessTokenIfValid(retrieved)).toBeNull();
    });
  });

  describe('Multiple Providers', () => {
    it('stores tokens for multiple providers independently', async () => {
      const store = await createFreshStore();

      store.setTokens('hub', {
        accessToken: 'hub-token',
        tokenType: 'Bearer',
      });

      store.setTokens('github', {
        accessToken: 'github-token',
        tokenType: 'Bearer',
      });

      store.setTokens('spotify', {
        accessToken: 'spotify-token',
        tokenType: 'Bearer',
      });

      expect(store.getTokens('hub')?.accessToken).toBe('hub-token');
      expect(store.getTokens('github')?.accessToken).toBe('github-token');
      expect(store.getTokens('spotify')?.accessToken).toBe('spotify-token');
    });

    it('deleting one provider does not affect others', async () => {
      const store = await createFreshStore();

      store.setTokens('hub', {
        accessToken: 'hub-token',
        tokenType: 'Bearer',
      });

      store.setTokens('github', {
        accessToken: 'github-token',
        tokenType: 'Bearer',
      });

      store.deleteTokens('hub');

      expect(store.hasTokens('hub')).toBe(false);
      expect(store.hasTokens('github')).toBe(true);
      expect(store.getTokens('github')?.accessToken).toBe('github-token');
    });
  });

  describe('Error Handling', () => {
    it('returns undefined on decryption failure', async () => {
      const store = await createFreshStore();

      // Store valid tokens first
      store.setTokens(HUB_PROVIDER, {
        accessToken: 'test-token',
        tokenType: 'Bearer',
      });

      // Make decryption fail
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const retrieved = store.getTokens(HUB_PROVIDER);

      expect(retrieved).toBeUndefined();
    });
  });

  describe('JSON Migration', () => {
    it('migrates tokens from legacy JSON file when table is empty', async () => {
      // Simulate a legacy JSON file existing
      const serialized = JSON.stringify({
        accessToken: 'legacy-token',
        tokenType: 'Bearer',
      });
      const encryptedBuffer = Buffer.from(`enc:${serialized}`);
      const jsonContent = JSON.stringify({
        [HUB_PROVIDER]: {
          encrypted: encryptedBuffer.toString('base64'),
          useSafeStorage: true,
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(jsonContent);

      const store = await createFreshStore();

      // Should have migrated the token
      const retrieved = store.getTokens(HUB_PROVIDER);
      expect(retrieved).toBeDefined();
      expect(retrieved?.accessToken).toBe('legacy-token');
    });

    it('does not migrate when table already has data', async () => {
      // Pre-populate the table
      db.insert(schema.oauthTokens).values({
        provider: 'existing',
        encrypted: 'some-data',
        useSafeStorage: false,
        updatedAt: new Date().toISOString(),
      }).run();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        [HUB_PROVIDER]: {
          encrypted: 'should-not-be-migrated',
          useSafeStorage: true,
        },
      }));

      await createFreshStore();

      // Should NOT have migrated the hub token
      const rows = db.select().from(schema.oauthTokens).all();
      expect(rows).toHaveLength(1);
      expect(rows[0].provider).toBe('existing');
    });

    it('does not migrate when JSON file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await createFreshStore();

      const rows = db.select().from(schema.oauthTokens).all();
      expect(rows).toHaveLength(0);
    });
  });
});
