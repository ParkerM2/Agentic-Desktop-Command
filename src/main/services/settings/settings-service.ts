/**
 * Settings Service — Disk-persisted app settings
 *
 * Settings are stored as JSON in the app's user data directory.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { AppSettings, Profile, WebhookConfig } from '@shared/types';

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

function loadSettingsFile(): SettingsFile {
  const filePath = getSettingsFilePath();
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<SettingsFile>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? parsed) },
        profiles:
          Array.isArray(parsed.profiles) && parsed.profiles.length > 0
            ? parsed.profiles
            : [...DEFAULT_PROFILES],
      };
    } catch {
      return { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] };
    }
  }
  return { settings: { ...DEFAULT_SETTINGS }, profiles: [...DEFAULT_PROFILES] };
}

function saveSettingsFile(data: SettingsFile): void {
  const filePath = getSettingsFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createSettingsService(): SettingsService {
  const store = loadSettingsFile();

  function persist(): void {
    saveSettingsFile(store);
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
