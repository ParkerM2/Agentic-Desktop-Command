/**
 * Email Encryption — Secret encryption/decryption using Electron safeStorage
 *
 * SMTP passwords are encrypted using Electron safeStorage (OS-level encryption:
 * Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 * Falls back to base64 when safeStorage is unavailable (CI/testing).
 */

import { safeStorage } from 'electron';

export interface EncryptedSecretEntry {
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

  console.warn('[Email] safeStorage not available - falling back to base64 encoding');
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
 * Get decrypted password from stored config.
 */
export function getDecryptedPassword(storedPass: EncryptedSecretEntry | string): string {
  if (typeof storedPass === 'string') {
    return storedPass;
  }
  if (isEncryptedEntry(storedPass)) {
    try {
      return decryptSecret(storedPass);
    } catch {
      console.error('[Email] Failed to decrypt password');
      return '';
    }
  }
  return '';
}
