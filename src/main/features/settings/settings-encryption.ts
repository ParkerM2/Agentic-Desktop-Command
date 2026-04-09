/**
 * Settings Encryption — Secret encryption/decryption for webhook secrets
 * and profile API keys.
 *
 * Uses Electron safeStorage (OS-level encryption: Keychain on macOS,
 * DPAPI on Windows, libsecret on Linux). Falls back to base64 when
 * safeStorage is unavailable (CI/testing).
 */

import { safeStorage } from 'electron';

import { fsLogger } from '@main/lib/logger';

const WEBHOOK_SECRET_KEYS = [
  'webhookSlackBotToken',
  'webhookSlackSigningSecret',
  'webhookGithubSecret',
] as const;

export type WebhookSecretKey = (typeof WEBHOOK_SECRET_KEYS)[number];

const PROFILE_SECRET_KEYS = ['apiKey', 'oauthToken'] as const;

export type ProfileSecretKey = (typeof PROFILE_SECRET_KEYS)[number];

interface EncryptedSecretEntry {
  encrypted: string;
  useSafeStorage: boolean;
}

/**
 * Check if a value is an encrypted secret entry.
 */
export function isEncryptedEntry(value: unknown): value is EncryptedSecretEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.encrypted === 'string' && typeof obj.useSafeStorage === 'boolean';
}

/**
 * Encrypt a secret string using safeStorage, falling back to base64.
 */
export function encryptSecret(value: string): EncryptedSecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return {
      encrypted: buffer.toString('base64'),
      useSafeStorage: true,
    };
  }

  fsLogger.warn('[Settings] safeStorage not available — falling back to base64 encoding');
  return {
    encrypted: Buffer.from(value, 'utf-8').toString('base64'),
    useSafeStorage: false,
  };
}

/**
 * Decrypt a secret entry.
 */
export function decryptSecret(entry: EncryptedSecretEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}

/**
 * Check if a key is a webhook secret key.
 */
export function isWebhookSecretKey(key: string): key is WebhookSecretKey {
  return (WEBHOOK_SECRET_KEYS as readonly string[]).includes(key);
}

/**
 * Check if a key is a profile secret key (fields that should be encrypted).
 */
export function isProfileSecretKey(key: string): key is ProfileSecretKey {
  return (PROFILE_SECRET_KEYS as readonly string[]).includes(key);
}
