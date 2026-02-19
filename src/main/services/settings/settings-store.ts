/** Settings Store — File I/O for loading and saving settings */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { AppSettings, Profile } from '@shared/types';

import { DEFAULT_PROFILES, DEFAULT_SETTINGS } from './settings-defaults';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedEntry,
  isProfileSecretKey,
  isWebhookSecretKey,
} from './settings-encryption';

import type { SettingsFile } from './settings-defaults';

function getSettingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

/** Load settings file with decryption. Handles plaintext-to-encrypted migration. */
export function loadSettingsFile(): { data: SettingsFile; needsMigration: boolean } {
  const filePath = getSettingsFilePath();
  if (!existsSync(filePath)) {
    return {
      data: { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] },
      needsMigration: false,
    };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown as Partial<SettingsFile> & Record<string, unknown>;

    const settingsRaw = (parsed.settings ?? parsed) as Record<string, unknown>;
    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    let needsMigration = false;

    for (const [key, value] of Object.entries(settingsRaw)) {
      if (isWebhookSecretKey(key)) {
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

    const rawProfiles =
      Array.isArray(parsed.profiles) && parsed.profiles.length > 0
        ? (parsed.profiles as unknown as Array<Record<string, unknown>>)
        : ([...DEFAULT_PROFILES] as unknown as Array<Record<string, unknown>>);

    const profiles = rawProfiles.map((profile) => {
      const decrypted = { ...profile };
      for (const [key, value] of Object.entries(profile)) {
        if (isProfileSecretKey(key)) {
          if (isEncryptedEntry(value)) {
            try {
              decrypted[key] = decryptSecret(value);
            } catch {
              console.error(`[Settings] Failed to decrypt profile ${key}`);
              decrypted[key] = '';
            }
          } else if (typeof value === 'string' && value.length > 0) {
            // Legacy plaintext — mark for migration
            decrypted[key] = value;
            needsMigration = true;
          }
        }
      }
      return decrypted;
    });

    return {
      data: { settings: settings as unknown as AppSettings, profiles: profiles as unknown as Profile[] },
      needsMigration,
    };
  } catch {
    return {
      data: { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] },
      needsMigration: false,
    };
  }
}

/** Save settings file with encryption of webhook secrets. */
export function saveSettingsFile(data: SettingsFile): void {
  const filePath = getSettingsFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const settingsRaw = data.settings as unknown as Record<string, unknown>;
  const encryptedSettings: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settingsRaw)) {
    encryptedSettings[key] =
      isWebhookSecretKey(key) && typeof value === 'string' && value.length > 0
        ? encryptSecret(value)
        : value;
  }

  const encryptedProfiles = data.profiles.map((profile) => {
    const raw = profile as unknown as Record<string, unknown>;
    const encrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      encrypted[key] =
        isProfileSecretKey(key) && typeof value === 'string' && value.length > 0
          ? encryptSecret(value)
          : value;
    }
    return encrypted;
  });

  const output = {
    settings: encryptedSettings,
    profiles: encryptedProfiles,
  };

  writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
}
