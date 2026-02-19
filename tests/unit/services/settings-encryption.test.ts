/**
 * Unit Tests for Settings Encryption
 *
 * Tests encrypt, decrypt, safeStorage mock interactions, plaintext fallback,
 * and key detection helpers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { safeStorage } from 'electron';

// Import after global electron mock is set up (via vitest.setup.ts)
const {
  encryptSecret,
  decryptSecret,
  isEncryptedEntry,
  isWebhookSecretKey,
  isProfileSecretKey,
} = await import('@main/services/settings/settings-encryption');

// ── Tests ───────────────────────────────────────────────────────────

describe('SettingsEncryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: encryption is available
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
    vi.mocked(safeStorage.encryptString).mockImplementation(
      (s: string) => Buffer.from(`enc:${s}`),
    );
    vi.mocked(safeStorage.decryptString).mockImplementation(
      (b: Buffer) => b.toString().replace('enc:', ''),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── encryptSecret() ─────────────────────────────────────────────

  describe('encryptSecret()', () => {
    it('encrypts using safeStorage when available', () => {
      const result = encryptSecret('my-secret-token');

      expect(safeStorage.isEncryptionAvailable).toHaveBeenCalled();
      expect(safeStorage.encryptString).toHaveBeenCalledWith('my-secret-token');
      expect(result.useSafeStorage).toBe(true);
      expect(typeof result.encrypted).toBe('string');
      // The encrypted value should be the base64-encoded result of safeStorage.encryptString
      expect(result.encrypted).toBe(Buffer.from('enc:my-secret-token').toString('base64'));
    });

    it('falls back to base64 when safeStorage is unavailable', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      const result = encryptSecret('fallback-secret');

      expect(safeStorage.isEncryptionAvailable).toHaveBeenCalled();
      expect(safeStorage.encryptString).not.toHaveBeenCalled();
      expect(result.useSafeStorage).toBe(false);
      expect(result.encrypted).toBe(Buffer.from('fallback-secret', 'utf-8').toString('base64'));
    });

    it('returns EncryptedSecretEntry shape', () => {
      const result = encryptSecret('test');

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('useSafeStorage');
      expect(typeof result.encrypted).toBe('string');
      expect(typeof result.useSafeStorage).toBe('boolean');
    });
  });

  // ── decryptSecret() ─────────────────────────────────────────────

  describe('decryptSecret()', () => {
    it('decrypts using safeStorage when useSafeStorage is true', () => {
      const encrypted = encryptSecret('decrypt-me');
      const decrypted = decryptSecret(encrypted);

      expect(safeStorage.decryptString).toHaveBeenCalled();
      expect(decrypted).toBe('decrypt-me');
    });

    it('decrypts using base64 when useSafeStorage is false', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      const encrypted = encryptSecret('base64-secret');
      const decrypted = decryptSecret(encrypted);

      expect(safeStorage.decryptString).not.toHaveBeenCalled();
      expect(decrypted).toBe('base64-secret');
    });

    it('round-trips correctly with safeStorage', () => {
      const original = 'xoxb-slack-token-12345';
      const encrypted = encryptSecret(original);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(original);
    });

    it('round-trips correctly with base64 fallback', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      const original = 'ghp_github_token_abc123';
      const encrypted = encryptSecret(original);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(original);
    });

    it('handles empty string round-trip with base64', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      const encrypted = encryptSecret('');
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe('');
    });

    it('handles special characters in round-trip', () => {
      const original = 'p@$$w0rd!#%^&*()_+{}|:"<>?';
      const encrypted = encryptSecret(original);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(original);
    });
  });

  // ── isEncryptedEntry() ──────────────────────────────────────────

  describe('isEncryptedEntry()', () => {
    it('returns true for valid encrypted entry', () => {
      expect(isEncryptedEntry({ encrypted: 'abc123', useSafeStorage: true })).toBe(true);
      expect(isEncryptedEntry({ encrypted: 'abc123', useSafeStorage: false })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isEncryptedEntry(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isEncryptedEntry(undefined)).toBe(false);
    });

    it('returns false for plain string', () => {
      expect(isEncryptedEntry('not-encrypted')).toBe(false);
    });

    it('returns false for number', () => {
      expect(isEncryptedEntry(42)).toBe(false);
    });

    it('returns false for object missing encrypted field', () => {
      expect(isEncryptedEntry({ useSafeStorage: true })).toBe(false);
    });

    it('returns false for object missing useSafeStorage field', () => {
      expect(isEncryptedEntry({ encrypted: 'abc' })).toBe(false);
    });

    it('returns false for object with wrong types', () => {
      expect(isEncryptedEntry({ encrypted: 123, useSafeStorage: true })).toBe(false);
      expect(isEncryptedEntry({ encrypted: 'abc', useSafeStorage: 'yes' })).toBe(false);
    });
  });

  // ── isWebhookSecretKey() ────────────────────────────────────────

  describe('isWebhookSecretKey()', () => {
    it('returns true for known webhook secret keys', () => {
      expect(isWebhookSecretKey('webhookSlackBotToken')).toBe(true);
      expect(isWebhookSecretKey('webhookSlackSigningSecret')).toBe(true);
      expect(isWebhookSecretKey('webhookGithubSecret')).toBe(true);
    });

    it('returns false for non-webhook keys', () => {
      expect(isWebhookSecretKey('theme')).toBe(false);
      expect(isWebhookSecretKey('language')).toBe(false);
      expect(isWebhookSecretKey('apiKey')).toBe(false);
      expect(isWebhookSecretKey('')).toBe(false);
    });
  });

  // ── isProfileSecretKey() ────────────────────────────────────────

  describe('isProfileSecretKey()', () => {
    it('returns true for known profile secret keys', () => {
      expect(isProfileSecretKey('apiKey')).toBe(true);
      expect(isProfileSecretKey('oauthToken')).toBe(true);
    });

    it('returns false for non-profile-secret keys', () => {
      expect(isProfileSecretKey('name')).toBe(false);
      expect(isProfileSecretKey('id')).toBe(false);
      expect(isProfileSecretKey('model')).toBe(false);
      expect(isProfileSecretKey('webhookSlackBotToken')).toBe(false);
      expect(isProfileSecretKey('')).toBe(false);
    });
  });
});
