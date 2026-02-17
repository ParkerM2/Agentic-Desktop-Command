/**
 * Briefing Config — Configuration loading and saving
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import type { BriefingConfig } from '@shared/types';

const DEFAULT_CONFIG: BriefingConfig = {
  enabled: true,
  scheduledTime: '09:00',
  includeGitHub: true,
  includeAgentActivity: true,
};

export interface BriefingConfigManager {
  /** Load config from disk (with defaults) */
  loadConfig: () => BriefingConfig;
  /** Save config to disk */
  saveConfig: (config: BriefingConfig) => void;
}

/**
 * Create a config manager for briefing settings.
 */
export function createBriefingConfigManager(configPath: string): BriefingConfigManager {
  function loadConfig(): BriefingConfig {
    if (!existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const content = readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...(JSON.parse(content) as Partial<BriefingConfig>) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  function saveConfig(config: BriefingConfig): void {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  return { loadConfig, saveConfig };
}
