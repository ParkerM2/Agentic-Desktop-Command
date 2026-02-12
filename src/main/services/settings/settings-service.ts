/**
 * Settings Service — Disk-persisted app settings
 *
 * Settings are stored as JSON in the app's user data directory.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { AppSettings } from '@shared/types';

export interface SettingsService {
  getSettings: () => AppSettings;
  updateSettings: (updates: Record<string, unknown>) => AppSettings;
  getProfiles: () => Array<{ id: string; name: string; isDefault: boolean }>;
  getAppVersion: () => { version: string };
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  colorTheme: 'default',
  language: 'en',
  uiScale: 1,
  onboardingCompleted: false,
};

function getSettingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): AppSettings {
  const filePath = getSettingsFilePath();
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<AppSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings): void {
  const filePath = getSettingsFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function createSettingsService(): SettingsService {
  let settings = loadSettings();

  return {
    getSettings() {
      return settings;
    },

    updateSettings(updates) {
      const merged: AppSettings = { ...settings, ...updates } as AppSettings & Record<string, unknown>;
      settings = merged;
      saveSettings(settings);
      return settings;
    },

    getProfiles() {
      // Single default profile for now
      return [{ id: 'default', name: 'Default', isDefault: true }];
    },

    getAppVersion() {
      return { version: app.getVersion() || '0.1.0' };
    },
  };
}
