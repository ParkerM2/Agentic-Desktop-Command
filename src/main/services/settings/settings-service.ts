/**
 * Settings Service — Disk-persisted app settings
 *
 * Settings are stored as JSON in the app's user data directory.
 * Webhook secrets are encrypted using Electron safeStorage (OS-level
 * encryption: Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 * Falls back to base64 when safeStorage is unavailable (CI/testing).
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app, safeStorage } from 'electron';

import type { AppSettings, Profile, WebhookConfig } from '@shared/types';

// Webhook secret keys that should be encrypted
const WEBHOOK_SECRET_KEYS = [
  'webhookSlackBotToken',
  'webhookSlackSigningSecret',
  'webhookGithubSecret',
] as const;

interface EncryptedSecretEntry {
  encrypted: string;
  useSafeStorage: boolean;
}

/**
 * Check if a value is an encrypted secret entry.
 */
function isEncryptedEntry(value: unknown): value is EncryptedSecretEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.encrypted === 'string' && typeof obj.useSafeStorage === 'boolean';
}

/**
 * Encrypt a secret string using safeStorage, falling back to base64.
 */
function encryptSecret(value: string): EncryptedSecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return {
      encrypted: buffer.toString('base64'),
      useSafeStorage: true,
    };
  }

  console.warn('[Settings] safeStorage not available — falling back to base64 encoding');
  return {
    encrypted: Buffer.from(value, 'utf-8').toString('base64'),
    useSafeStorage: false,
  };
}

/**
 * Decrypt a secret entry.
 */
function decryptSecret(entry: EncryptedSecretEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}

/**
 * Check if a key is a webhook secret key.
 */
function isWebhookSecretKey(key: string): key is (typeof WEBHOOK_SECRET_KEYS)[number] {
  return (WEBHOOK_SECRET_KEYS as readonly string[]).includes(key);
}

export interface SettingsService {
  getSettings: () => AppSettings;
  updateSettings: (updates: Record<string, unknown>) => AppSettings;
  getProfiles: () => Profile[];
  createProfile: (data: { name: string; apiKey?: string; model?: string }) => Profile;
  updateProfile: (
    id: string,
    updates: { name?: string; apiKey?: string; model?: string },
  ) => Profile;
  deleteProfile: (id: string) => { success: boolean };
  setDefaultProfile: (id: string) => { success: boolean };
  getAppVersion: () => { version: string };
  getWebhookConfig: () => WebhookConfig;
  updateWebhookConfig: (updates: {
    slack?: { botToken?: string; signingSecret?: string };
    github?: { webhookSecret?: string };
  }) => { success: boolean };
}

interface SettingsFile {
  settings: AppSettings;
  profiles: Profile[];
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  colorTheme: 'default',
  language: 'en',
  uiScale: 100,
  onboardingCompleted: false,
};

const DEFAULT_PROFILES: Profile[] = [{ id: 'default', name: 'Default', isDefault: true }];

function getSettingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

/**
 * Load settings file with decryption of webhook secrets.
 * Handles migration from plaintext to encrypted format.
 */
function loadSettingsFile(): { data: SettingsFile; needsMigration: boolean } {
  const filePath = getSettingsFilePath();
  if (!existsSync(filePath)) {
    return { data: { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] }, needsMigration: false };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown as Partial<SettingsFile> & Record<string, unknown>;

    // Get the settings object (could be nested or flat)
    const settingsRaw = (parsed.settings ?? parsed) as Record<string, unknown>;
    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    let needsMigration = false;

    // Copy and decrypt settings
    for (const [key, value] of Object.entries(settingsRaw)) {
      if (isWebhookSecretKey(key)) {
        // Handle encrypted entry
        if (isEncryptedEntry(value)) {
          try {
            settings[key] = decryptSecret(value);
          } catch {
            console.error(`[Settings] Failed to decrypt ${key}`);
            settings[key] = '';
          }
        } else if (typeof value === 'string' && value.length > 0) {
          // Legacy plaintext value — mark for migration
          settings[key] = value;
          needsMigration = true;
        } else {
          settings[key] = '';
        }
      } else {
        settings[key] = value;
      }
    }

    const profiles =
      Array.isArray(parsed.profiles) && parsed.profiles.length > 0
        ? parsed.profiles
        : [...DEFAULT_PROFILES];

    return {
      data: { settings: settings as unknown as AppSettings, profiles },
      needsMigration,
    };
  } catch {
    return { data: { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] }, needsMigration: false };
  }
}

/**
 * Save settings file with encryption of webhook secrets.
 */
function saveSettingsFile(data: SettingsFile): void {
  const filePath = getSettingsFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create a copy of settings with encrypted webhook secrets
  const settingsRaw = data.settings as unknown as Record<string, unknown>;
  const encryptedSettings: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settingsRaw)) {
    // Encrypt non-empty webhook secrets, pass through everything else
    encryptedSettings[key] =
      isWebhookSecretKey(key) && typeof value === 'string' && value.length > 0
        ? encryptSecret(value)
        : value;
  }

  const output = {
    settings: encryptedSettings,
    profiles: data.profiles,
  };

  writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
}

export function createSettingsService(): SettingsService {
  const { data: store, needsMigration } = loadSettingsFile();

  function persist(): void {
    saveSettingsFile(store);
  }

  // Migrate plaintext secrets to encrypted format on first load
  if (needsMigration) {
    console.log('[Settings] Migrating plaintext webhook secrets to encrypted format');
    persist();
  }

  return {
    getSettings() {
      return store.settings;
    },

    updateSettings(updates) {
      const merged: AppSettings = {
        ...store.settings,
        ...updates,
      } as AppSettings & Record<string, unknown>;
      store.settings = merged;
      persist();
      return store.settings;
    },

    getProfiles() {
      return store.profiles;
    },

    createProfile(data) {
      const profile: Profile = {
        id: randomUUID(),
        name: data.name,
        apiKey: data.apiKey,
        model: data.model,
        isDefault: store.profiles.length === 0,
      };
      store.profiles.push(profile);
      persist();
      return profile;
    },

    updateProfile(id, updates) {
      const index = store.profiles.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Profile not found: ${id}`);
      }
      const existing = store.profiles[index];
      const updated: Profile = {
        ...existing,
        ...updates,
      };
      store.profiles[index] = updated;
      persist();
      return updated;
    },

    deleteProfile(id) {
      const index = store.profiles.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Profile not found: ${id}`);
      }
      const profile = store.profiles[index];
      if (profile.isDefault && store.profiles.length > 1) {
        // Prevent deleting the last default — reassign default to another profile
        const remaining = store.profiles.filter((p) => p.id !== id);
        remaining[0].isDefault = true;
        store.profiles = remaining;
      } else if (store.profiles.length <= 1) {
        throw new Error('Cannot delete the last profile');
      } else {
        store.profiles = store.profiles.filter((p) => p.id !== id);
      }
      persist();
      return { success: true };
    },

    setDefaultProfile(id) {
      const target = store.profiles.find((p) => p.id === id);
      if (!target) {
        throw new Error(`Profile not found: ${id}`);
      }
      for (const p of store.profiles) {
        p.isDefault = p.id === id;
      }
      persist();
      return { success: true };
    },

    getAppVersion() {
      return { version: app.getVersion() || '0.1.0' };
    },

    getWebhookConfig() {
      const raw = store.settings as unknown as Record<string, unknown>;
      const slackBotToken = (raw.webhookSlackBotToken as string | undefined) ?? '';
      const slackSigningSecret = (raw.webhookSlackSigningSecret as string | undefined) ?? '';
      const githubSecret = (raw.webhookGithubSecret as string | undefined) ?? '';

      return {
        slack: {
          botToken: slackBotToken,
          signingSecret: slackSigningSecret,
          configured: slackBotToken.length > 0 && slackSigningSecret.length > 0,
        },
        github: {
          webhookSecret: githubSecret,
          configured: githubSecret.length > 0,
        },
      };
    },

    updateWebhookConfig(updates) {
      const raw = store.settings as unknown as Record<string, unknown>;
      if (updates.slack) {
        if (updates.slack.botToken !== undefined) {
          raw.webhookSlackBotToken = updates.slack.botToken;
        }
        if (updates.slack.signingSecret !== undefined) {
          raw.webhookSlackSigningSecret = updates.slack.signingSecret;
        }
      }
      if (updates.github?.webhookSecret !== undefined) {
          raw.webhookGithubSecret = updates.github.webhookSecret;
        }
      persist();
      return { success: true };
    },
  };
}
