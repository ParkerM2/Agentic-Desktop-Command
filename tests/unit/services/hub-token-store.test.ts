/**
 * Unit Tests — HubTokenStore
 *
 * Tests the TokenStore implementation used by the Hub authentication service.
 * Focuses on token encryption, storage, and expiry checking.
 */

import { createFsFromVolume, Volume } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OAuthTokens } from '@main/auth/types';

// ─── Shared Volume ────────────────────────────────────────────────────
// Create a shared volume instance that will be used by both the mock and tests
let sharedVol = Volume.fromJSON({});

// ─── Mocks ────────────────────────────────────────────────────────────

// Mock node:fs with memfs using the shared volume
vi.mock('node:fs', () => {
  const fs = createFsFromVolume(sharedVol);
  return {
    ...fs,
    default: fs,
  };
});

// Mock electron safeStorage
const mockSafeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
  decryptString: vi.fn((b: Buffer) => b.toString().replace('enc:', '')),
};

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
}));

// ─── Constants ────────────────────────────────────────────────────────

const HUB_PROVIDER = 'hub';
const DATA_DIR = '/mock/userData';
const TOKENS_FILE = `${DATA_DIR}/oauth-tokens.json`;

// ─── Test Suite ───────────────────────────────────────────────────────

describe('HubTokenStore', () => {
  beforeEach(() => {
    // Reset the shared volume
    sharedVol = Volume.fromJSON({});
    sharedVol.mkdirSync(DATA_DIR, { recursive: true });

    // Clear all mocks
    vi.clearAllMocks();

    // Reset modules so the service gets fresh fs mock
    vi.resetModules();

    // Re-apply the fs mock with fresh volume
    vi.doMock('node:fs', () => {
      const fs = createFsFromVolume(sharedVol);
      return {
        ...fs,
        default: fs,
      };
    });

    // Reset safeStorage mocks to default behavior
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockImplementation((s: string) => Buffer.from(`enc:${s}`));
    mockSafeStorage.decryptString.mockImplementation((b: Buffer) => b.toString().replace('enc:', ''));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to dynamically import token store with fresh module state
   */
  async function createFreshStore() {
    const { createTokenStore } = await import('@main/auth/token-store');
    return createTokenStore({ dataDir: DATA_DIR });
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

      // Verify the encrypted value is stored in the file
      const fileContent = sharedVol.readFileSync(TOKENS_FILE, 'utf-8') as string;
      expect(fileContent).toBeDefined();

      const parsed = JSON.parse(fileContent) as Record<string, { encrypted: string; useSafeStorage: boolean }>;
      expect(parsed[HUB_PROVIDER]).toBeDefined();
      expect(parsed[HUB_PROVIDER].useSafeStorage).toBe(true);
      // The encrypted value should be base64 encoded
      expect(parsed[HUB_PROVIDER].encrypted).toBeDefined();
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

      // Verify the value is stored with useSafeStorage: false
      const fileContent = sharedVol.readFileSync(TOKENS_FILE, 'utf-8') as string;
      expect(fileContent).toBeDefined();

      const parsed = JSON.parse(fileContent) as Record<string, { encrypted: string; useSafeStorage: boolean }>;
      expect(parsed[HUB_PROVIDER].useSafeStorage).toBe(false);
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

      // Set tokens for hub provider
      store.setTokens(HUB_PROVIDER, {
        accessToken: 'test-token',
        tokenType: 'Bearer',
      });

      // Try to get tokens for a different provider
      const retrieved = store.getTokens('other-provider');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('deleteTokens() / clearTokens()', () => {
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

    it('persists deletion to file', async () => {
      const store = await createFreshStore();

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'persist-delete-token',
        tokenType: 'Bearer',
      });

      store.deleteTokens(HUB_PROVIDER);

      // Verify the file no longer contains the hub provider
      const fileContent = sharedVol.readFileSync(TOKENS_FILE, 'utf-8') as string;
      expect(fileContent).toBeDefined();

      const parsed = JSON.parse(fileContent) as Record<string, unknown>;
      expect(parsed[HUB_PROVIDER]).toBeUndefined();
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
    /**
     * Helper function to check if tokens are expired.
     * This mirrors the logic that would be used in HubAuthService.
     */
    function isTokenExpired(tokens: OAuthTokens | undefined): boolean {
      if (!tokens?.expiresAt) {
        return true;
      }
      const expiresAtDate = new Date(tokens.expiresAt);
      return expiresAtDate.getTime() <= Date.now();
    }

    /**
     * Helper function to get access token if valid.
     * This mirrors the logic that would be used in HubAuthService.
     */
    function getAccessTokenIfValid(tokens: OAuthTokens | undefined): string | null {
      if (!tokens?.accessToken) {
        return null;
      }
      if (isTokenExpired(tokens)) {
        return null;
      }
      return tokens.accessToken;
    }

    it('isExpired returns true for expired tokens', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

      const store = await createFreshStore();

      // Set tokens that expired in the past
      const tokens: OAuthTokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-01-01T00:00:00.000Z', // Past date
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

      // Set tokens that expire in the future
      const tokens: OAuthTokens = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-12-31T23:59:59.000Z', // Future date
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
        // No expiresAt field
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
        expiresAt: '2026-12-31T23:59:59.000Z', // Future date
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
        expiresAt: '2026-01-01T00:00:00.000Z', // Past date
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

  describe('Persistence', () => {
    it('loads existing tokens from file on creation', async () => {
      // Pre-populate the file with encrypted tokens
      const preExistingTokens: OAuthTokens = {
        accessToken: 'pre-existing-token',
        refreshToken: 'pre-existing-refresh',
        tokenType: 'Bearer',
      };

      // Manually create the encrypted file content
      const serialized = JSON.stringify(preExistingTokens);
      const encryptedBuffer = Buffer.from(`enc:${serialized}`);
      const fileContent = JSON.stringify({
        [HUB_PROVIDER]: {
          encrypted: encryptedBuffer.toString('base64'),
          useSafeStorage: true,
        },
      });

      sharedVol.writeFileSync(TOKENS_FILE, fileContent);

      // Create a new store - should load existing tokens
      const store = await createFreshStore();

      const retrieved = store.getTokens(HUB_PROVIDER);
      expect(retrieved).toBeDefined();
      expect(retrieved?.accessToken).toBe('pre-existing-token');
    });

    it('creates data directory if it does not exist', async () => {
      // Reset volume without the data directory
      sharedVol = Volume.fromJSON({});
      vi.resetModules();
      vi.doMock('node:fs', () => {
        const fs = createFsFromVolume(sharedVol);
        return {
          ...fs,
          default: fs,
        };
      });

      const newDataDir = '/mock/new-data-dir';

      const { createTokenStore } = await import('@main/auth/token-store');
      const store = createTokenStore({ dataDir: newDataDir });

      store.setTokens(HUB_PROVIDER, {
        accessToken: 'new-dir-token',
        tokenType: 'Bearer',
      });

      // Directory and file should now exist
      expect(sharedVol.existsSync(`${newDataDir}/oauth-tokens.json`)).toBe(true);
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

      // Reset modules and create a new store to trigger re-read with failing decryption
      vi.resetModules();
      vi.doMock('node:fs', () => {
        const fs = createFsFromVolume(sharedVol);
        return {
          ...fs,
          default: fs,
        };
      });

      const { createTokenStore } = await import('@main/auth/token-store');
      const store2 = createTokenStore({ dataDir: DATA_DIR });
      const retrieved = store2.getTokens(HUB_PROVIDER);

      expect(retrieved).toBeUndefined();
    });

    it('returns empty store when token file is corrupted', async () => {
      // Write corrupted JSON
      sharedVol.writeFileSync(TOKENS_FILE, 'not valid json {{{');

      const store = await createFreshStore();

      // Should return undefined without throwing
      expect(store.getTokens(HUB_PROVIDER)).toBeUndefined();
      expect(store.hasTokens(HUB_PROVIDER)).toBe(false);
    });
  });
});
