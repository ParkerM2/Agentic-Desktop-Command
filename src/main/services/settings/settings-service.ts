/**
 * Settings Service — Disk-persisted app settings
 *
 * Public API for reading/updating settings, profiles, webhooks, and agent config.
 * File I/O delegated to settings-store, encryption to settings-encryption,
 * defaults to settings-defaults.
 */

import { randomUUID } from 'node:crypto';

import { app } from 'electron';

import type { AgentSettings, AppSettings, Profile, WebhookConfig } from '@shared/types';

import { fsLogger } from '@main/lib/logger';

import { DEFAULT_AGENT_SETTINGS } from './settings-defaults';
import { loadSettingsFile, saveSettingsFile } from './settings-store';

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
  getAgentSettings: () => AgentSettings;
  setAgentSettings: (settings: AgentSettings) => { success: boolean };
}

export function createSettingsService(): SettingsService {
  const { data: store, needsMigration } = loadSettingsFile();

  function persist(): void {
    saveSettingsFile(store);
  }

  // Migrate plaintext secrets to encrypted format on first load
  if (needsMigration) {
    fsLogger.info('[Settings] Migrating plaintext secrets to encrypted format');
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

      // Auto-create/update "Default" profile when anthropicApiKey is set
      if (typeof updates.anthropicApiKey === 'string' && updates.anthropicApiKey.length > 0) {
        const apiKeyValue = updates.anthropicApiKey;
        const defaultProfile = store.profiles.find((p) => p.isDefault);
        if (defaultProfile) {
          defaultProfile.apiKey = apiKeyValue;
        } else {
          store.profiles.unshift({
            id: randomUUID(),
            name: 'Default',
            apiKey: apiKeyValue,
            isDefault: true,
          });
        }
      }

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

    getAgentSettings() {
      return store.settings.agentSettings ?? DEFAULT_AGENT_SETTINGS;
    },

    setAgentSettings(settings) {
      store.settings.agentSettings = {
        ...DEFAULT_AGENT_SETTINGS,
        ...settings,
        maxConcurrentAgents: Math.max(1, settings.maxConcurrentAgents),
      };
      persist();
      return { success: true };
    },
  };
}
