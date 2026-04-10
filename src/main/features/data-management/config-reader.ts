/**
 * Config Reader
 *
 * Boot-time config file reader. Reads `adc-config.json` from the default
 * Electron userData path. This file always lives at the OS default location
 * and points to the real data directory (chicken-and-egg solution).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AdcConfig } from '@shared/types';

const ADC_CONFIG_FILENAME = 'adc-config.json';

const DEFAULT_CONFIG: AdcConfig = {
  dataDir: null,
  previousDataDir: null,
  pendingMigration: false,
  confirmedNonEmpty: false,
};

export interface ConfigReader {
  /** Get current config */
  getConfig: () => AdcConfig;
  /** Update config (partial merge) */
  updateConfig: (updates: Partial<AdcConfig>) => AdcConfig;
  /** Resolve the effective data directory — custom if set, default otherwise */
  resolveDataDir: () => string;
  /** Get the default (OS) data directory path */
  getDefaultDataDir: () => string;
}

export function createConfigReader(defaultUserDataPath: string): ConfigReader {
  const configPath = join(defaultUserDataPath, ADC_CONFIG_FILENAME);

  function getConfig(): AdcConfig {
    if (!existsSync(configPath)) return { ...DEFAULT_CONFIG };
    try {
      const raw = readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AdcConfig>) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  function updateConfig(updates: Partial<AdcConfig>): AdcConfig {
    const current = getConfig();
    const updated = { ...current, ...updates };
    mkdirSync(defaultUserDataPath, { recursive: true });
    writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  function resolveDataDir(): string {
    const config = getConfig();
    return config.dataDir ?? defaultUserDataPath;
  }

  function getDefaultDataDir(): string {
    return defaultUserDataPath;
  }

  return { getConfig, updateConfig, resolveDataDir, getDefaultDataDir };
}
