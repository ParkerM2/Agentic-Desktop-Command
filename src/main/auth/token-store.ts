/**
 * Token Store — Secure encrypted token persistence using Electron safeStorage.
 *
 * Tokens are encrypted with OS-level credentials (Keychain on macOS,
 * DPAPI on Windows, libsecret on Linux) before writing to disk.
 * Falls back to base64 encoding when safeStorage is unavailable (CI/testing).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

import { authLogger } from '@main/lib/logger';

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

type TokenFileData = Partial<Record<string, EncryptedTokenEntry>>;

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

function getFilePath(dataDir: string): string {
  return join(dataDir, 'oauth-tokens.json');
}

function loadTokenFile(dataDir: string): TokenFileData {
  const filePath = getFilePath(dataDir);
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as TokenFileData;
  } catch {
    authLogger.error('Failed to read token file — returning empty store');
    return {};
  }
}

function saveTokenFile(dataDir: string, data: TokenFileData): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  const filePath = getFilePath(dataDir);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createTokenStore(deps: { dataDir: string }): TokenStore {
  const { dataDir } = deps;
  const store = loadTokenFile(dataDir);

  return {
    setTokens(provider, tokens) {
      const serialized = JSON.stringify(tokens);
      store[provider] = encryptValue(serialized);
      saveTokenFile(dataDir, store);
    },

    getTokens(provider) {
      const entry = store[provider];
      if (!entry) {
        return;
      }

      try {
        const decrypted = decryptValue(entry);
        return JSON.parse(decrypted) as OAuthTokens;
      } catch {
        authLogger.error(`Failed to decrypt tokens for provider: ${provider}`);
        return;
      }
    },

    deleteTokens(provider) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- token store keyed by provider name
      delete store[provider];
      saveTokenFile(dataDir, store);
    },

    hasTokens(provider) {
      return provider in store;
    },
  };
}
