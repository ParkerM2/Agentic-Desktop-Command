/**
 * OAuth Provider Credential Storage
 *
 * Loads/saves OAuth client credentials (clientId, clientSecret)
 * from <userData>/oauth-providers.json. Credentials are encrypted
 * using Electron safeStorage (OS-level encryption: Keychain on macOS,
 * DPAPI on Windows, libsecret on Linux). Falls back to base64 when
 * safeStorage is unavailable (CI/testing).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

interface EncryptedCredentialsEntry {
  encrypted: string;
  useSafeStorage: boolean;
}

type EncryptedCredentialsFile = Record<string, EncryptedCredentialsEntry>;

const CREDENTIALS_FILENAME = 'oauth-providers.json';

function getCredentialsPath(dataDir: string): string {
  return join(dataDir, CREDENTIALS_FILENAME);
}

/**
 * Encrypt credentials using safeStorage, falling back to base64.
 */
function encryptCredentials(creds: OAuthCredentials): EncryptedCredentialsEntry {
  const serialized = JSON.stringify(creds);

  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(serialized);
    return {
      encrypted: buffer.toString('base64'),
      useSafeStorage: true,
    };
  }

  console.warn('[OAuth] safeStorage not available — falling back to base64 encoding');
  return {
    encrypted: Buffer.from(serialized, 'utf-8').toString('base64'),
    useSafeStorage: false,
  };
}

/**
 * Decrypt credentials entry.
 */
function decryptCredentials(entry: EncryptedCredentialsEntry): OAuthCredentials {
  let decrypted: string;

  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    decrypted = safeStorage.decryptString(buffer);
  } else {
    decrypted = Buffer.from(entry.encrypted, 'base64').toString('utf-8');
  }

  return JSON.parse(decrypted) as OAuthCredentials;
}

/**
 * Check if an entry is in the legacy unencrypted format.
 */
function isLegacyEntry(entry: unknown): entry is OAuthCredentials {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const obj = entry as Record<string, unknown>;
  // Legacy format has clientId/clientSecret directly, not encrypted/useSafeStorage
  return (
    typeof obj.clientId === 'string' &&
    typeof obj.clientSecret === 'string' &&
    !('encrypted' in obj)
  );
}

/**
 * Check if an entry is in the encrypted format.
 */
function isEncryptedEntry(entry: unknown): entry is EncryptedCredentialsEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const obj = entry as Record<string, unknown>;
  return typeof obj.encrypted === 'string' && typeof obj.useSafeStorage === 'boolean';
}

export function loadOAuthCredentials(dataDir: string): Map<string, OAuthCredentials> {
  const filePath = getCredentialsPath(dataDir);
  const result = new Map<string, OAuthCredentials>();

  if (!existsSync(filePath)) {
    return result;
  }

  let needsMigration = false;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    for (const [name, entry] of Object.entries(parsed)) {
      // Handle legacy unencrypted format — migrate silently
      if (isLegacyEntry(entry)) {
        result.set(name, { clientId: entry.clientId, clientSecret: entry.clientSecret });
        needsMigration = true;
        continue;
      }

      // Handle encrypted format
      if (isEncryptedEntry(entry)) {
        try {
          const creds = decryptCredentials(entry);
          result.set(name, creds);
        } catch {
          console.error(`[OAuth] Failed to decrypt credentials for provider: ${name}`);
        }
      }
    }

    // Re-save with encryption if we found legacy entries
    if (needsMigration) {
      console.log('[OAuth] Migrating plaintext credentials to encrypted format');
      saveAllCredentials(dataDir, result);
    }
  } catch {
    console.error('[OAuth] Failed to load provider credentials');
  }

  return result;
}

/**
 * Save all credentials (used for migration).
 */
function saveAllCredentials(dataDir: string, credentials: Map<string, OAuthCredentials>): void {
  const filePath = getCredentialsPath(dataDir);
  const encrypted: EncryptedCredentialsFile = {};

  for (const [name, creds] of credentials) {
    encrypted[name] = encryptCredentials(creds);
  }

  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(encrypted, null, 2), 'utf-8');
}

export function saveOAuthCredentials(
  dataDir: string,
  name: string,
  creds: OAuthCredentials,
): void {
  const filePath = getCredentialsPath(dataDir);
  const existingEntries: EncryptedCredentialsFile = {};

  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      // Load existing encrypted entries, skip legacy (they'll be migrated via loadOAuthCredentials)
      for (const [key, entry] of Object.entries(parsed)) {
        if (isEncryptedEntry(entry)) {
          existingEntries[key] = entry;
        }
      }
    } catch {
      // Start fresh
    }
  }

  existingEntries[name] = encryptCredentials(creds);

  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(existingEntries, null, 2), 'utf-8');
}
