/**
 * Token Store — Secure encrypted token persistence using Electron safeStorage.
 *
 * Tokens are encrypted with OS-level credentials (Keychain on macOS,
 * DPAPI on Windows, libsecret on Linux) before writing to SQLite.
 * Falls back to base64 encoding when safeStorage is unavailable (CI/testing).
 *
 * Migrates from legacy `oauth-tokens.json` on first access when the table is empty.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

import { eq } from 'drizzle-orm';

import { authLogger } from '@main/lib/logger';

import { oauthTokens } from '../db/schema';

import type { AdcDatabase } from '../db';
import type { OAuthTokens } from './types';

export interface TokenStore {
  /** Store tokens securely for a provider */
  setTokens: (provider: string, tokens: OAuthTokens) => void;
  /** Retrieve tokens for a provider */
  getTokens: (provider: string) => OAuthTokens | undefined;
  /** Delete tokens for a provider */
  deleteTokens: (provider: string) => void;
  /** Check if tokens exist for a provider */
  hasTokens: (provider: string) => boolean;
}

interface EncryptedTokenEntry {
  encrypted: string;
  useSafeStorage: boolean;
}

function encryptValue(value: string): EncryptedTokenEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return {
      encrypted: buffer.toString('base64'),
      useSafeStorage: true,
    };
  }

  authLogger.warn('safeStorage not available — falling back to base64 encoding');
  return {
    encrypted: Buffer.from(value, 'utf-8').toString('base64'),
    useSafeStorage: false,
  };
}

function decryptValue(entry: EncryptedTokenEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}

/**
 * Migrate tokens from the legacy `oauth-tokens.json` file into the SQLite table.
 * Only runs when the table is empty and the JSON file exists.
 */
export function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(oauthTokens).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'oauth-tokens.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Record<string, EncryptedTokenEntry>>;
    let count = 0;

    for (const [provider, entry] of Object.entries(parsed)) {
      if (!provider || !entry) continue;
      db.insert(oauthTokens)
        .values({
          provider,
          encrypted: entry.encrypted,
          useSafeStorage: entry.useSafeStorage,
          updatedAt: new Date().toISOString(),
        })
        .run();
      count++;
    }
    authLogger.info(`Migrated ${String(count)} OAuth token(s) from JSON to SQLite`);
  } catch (err) {
    authLogger.error('Failed to migrate OAuth tokens from JSON:', err);
  }
}

export function createTokenStore(deps: { db: AdcDatabase; dataDir: string }): TokenStore {
  const { db, dataDir } = deps;

  // One-time migration from legacy JSON file
  migrateFromJson(db, dataDir);

  return {
    setTokens(provider, tokens) {
      const serialized = JSON.stringify(tokens);
      const entry = encryptValue(serialized);
      const now = new Date().toISOString();

      db.insert(oauthTokens)
        .values({
          provider,
          encrypted: entry.encrypted,
          useSafeStorage: entry.useSafeStorage,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: oauthTokens.provider,
          set: {
            encrypted: entry.encrypted,
            useSafeStorage: entry.useSafeStorage,
            updatedAt: now,
          },
        })
        .run();
    },

    getTokens(provider) {
      const row = db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.provider, provider))
        .get();

      if (!row) return;

      try {
        const decrypted = decryptValue({
          encrypted: row.encrypted,
          useSafeStorage: row.useSafeStorage,
        });
        return JSON.parse(decrypted) as OAuthTokens;
      } catch {
        authLogger.error(`Failed to decrypt tokens for provider: ${provider}`);
        return;
      }
    },

    deleteTokens(provider) {
      db.delete(oauthTokens).where(eq(oauthTokens.provider, provider)).run();
    },

    hasTokens(provider) {
      const row = db
        .select({ provider: oauthTokens.provider })
        .from(oauthTokens)
        .where(eq(oauthTokens.provider, provider))
        .get();
      return row !== undefined;
    },
  };
}
