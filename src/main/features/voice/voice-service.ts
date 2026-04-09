/**
 * Voice Service — Manages voice configuration persistence
 *
 * Voice recognition happens in the renderer process using Web Speech API.
 * This service handles config persistence and permission checking.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app, systemPreferences } from 'electron';

import type { VoiceConfig, VoiceInputMode } from '@shared/types';
import { DEFAULT_VOICE_CONFIG } from '@shared/types';

export interface VoiceService {
  getConfig: () => VoiceConfig;
  updateConfig: (updates: Partial<VoiceConfig>) => VoiceConfig;
  checkPermission: () => { granted: boolean; canRequest: boolean };
}

interface VoiceConfigFile {
  config: VoiceConfig;
}

function getConfigFilePath(): string {
  return join(app.getPath('userData'), 'voice-config.json');
}

function loadConfig(): VoiceConfig {
  const filePath = getConfigFilePath();
  if (!existsSync(filePath)) {
    return { ...DEFAULT_VOICE_CONFIG };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as VoiceConfigFile;
    return {
      ...DEFAULT_VOICE_CONFIG,
      ...parsed.config,
    };
  } catch {
    return { ...DEFAULT_VOICE_CONFIG };
  }
}

function saveConfig(config: VoiceConfig): void {
  const filePath = getConfigFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const data: VoiceConfigFile = { config };
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createVoiceService(): VoiceService {
  let config = loadConfig();

  function persist(): void {
    saveConfig(config);
  }

  return {
    getConfig() {
      return { ...config };
    },

    updateConfig(updates) {
      config = {
        ...config,
        ...updates,
      };

      // Validate inputMode if provided
      if (updates.inputMode !== undefined) {
        const validModes: VoiceInputMode[] = ['push_to_talk', 'continuous'];
        if (!validModes.includes(updates.inputMode)) {
          config.inputMode = 'push_to_talk';
        }
      }

      persist();
      return { ...config };
    },

    checkPermission() {
      // On macOS, check microphone permission
      if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('microphone');
        return {
          granted: status === 'granted',
          canRequest: status === 'not-determined',
        };
      }

      // On Windows and Linux, assume granted (browser handles permission)
      // The actual permission dialog is shown by the browser when using Web Speech API
      return {
        granted: true,
        canRequest: false,
      };
    },
  };
}
