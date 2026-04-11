/**
 * Voice Service — Manages voice configuration persistence
 *
 * Voice recognition happens in the renderer process using Web Speech API.
 * This service handles config persistence and permission checking.
 * Config is stored in the settings_kv table under key 'voice-config'.
 */

import { systemPreferences } from 'electron';

import { eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';
import type { VoiceConfig, VoiceInputMode } from '@shared/types';
import { DEFAULT_VOICE_CONFIG } from '@shared/types';

import type { AdcDatabase } from '@main/db';
import { settingsKv } from '@main/db/schema';

export interface VoiceService {
  getConfig: () => VoiceConfig;
  updateConfig: (updates: Partial<VoiceConfig>) => VoiceConfig;
  checkPermission: () => { granted: boolean; canRequest: boolean };
}

const VOICE_CONFIG_KEY = 'voice-config';

export function createVoiceService(deps: { db: AdcDatabase }): VoiceService {
  const { db } = deps;

  function loadConfig(): VoiceConfig {
    const rows = db.select().from(settingsKv).where(eq(settingsKv.key, VOICE_CONFIG_KEY)).all();
    if (rows.length === 0) {
      return { ...DEFAULT_VOICE_CONFIG };
    }
    try {
      const stored = rows[0].settings as VoiceConfig;
      return { ...DEFAULT_VOICE_CONFIG, ...stored };
    } catch {
      return { ...DEFAULT_VOICE_CONFIG };
    }
  }

  function saveConfig(config: VoiceConfig): void {
    const now = new Date().toISOString();
    db.insert(settingsKv)
      .values({ id: generateId(), key: VOICE_CONFIG_KEY, settings: config, updatedAt: now })
      .onConflictDoUpdate({ target: settingsKv.key, set: { settings: config, updatedAt: now } })
      .run();
  }

  let config = loadConfig();

  return {
    getConfig() {
      return { ...config };
    },

    updateConfig(updates) {
      config = { ...config, ...updates };

      // Validate inputMode if provided
      if (updates.inputMode !== undefined) {
        const validModes: VoiceInputMode[] = ['push_to_talk', 'continuous'];
        if (!validModes.includes(updates.inputMode)) {
          config.inputMode = 'push_to_talk';
        }
      }

      saveConfig(config);
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
      return {
        granted: true,
        canRequest: false,
      };
    },
  };
}
