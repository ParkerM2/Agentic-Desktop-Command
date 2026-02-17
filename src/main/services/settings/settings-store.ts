/** Settings Store — File I/O for loading and saving settings */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { AppSettings } from '@shared/types';

import { DEFAULT_PROFILES, DEFAULT_SETTINGS } from './settings-defaults';
import { decryptSecret, encryptSecret, isEncryptedEntry, isWebhookSecretKey } from './settings-encryption';

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

    const profiles =
      Array.isArray(parsed.profiles) && parsed.profiles.length > 0
        ? parsed.profiles
        : [...DEFAULT_PROFILES];

    return {
      data: { settings: settings as unknown as AppSettings, profiles },
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

  const output = {
    settings: encryptedSettings,
    profiles: data.profiles,
  };

  writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
}
