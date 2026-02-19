/**
 * Hub Config Store
 *
 * Encrypted persistence for hub connection configuration.
 * API keys are encrypted via Electron safeStorage (OS credential store).
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app, safeStorage } from 'electron';

import { hubLogger } from '@main/lib/logger';

export interface PersistedHubConfig {
  hubUrl: string;
  /** Base64-encoded encrypted API key. */
  encryptedApiKey: string;
  enabled: boolean;
  lastConnected?: string;
}

const CONFIG_FILENAME = 'hub-config.json';

function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILENAME);
}

export function encryptApiKey(apiKey: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  }
  // Fallback: base64 encoding (not truly secure, but functional)
  return Buffer.from(apiKey, 'utf-8').toString('base64');
}

export function decryptApiKey(encoded: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encoded, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

export function loadConfig(): PersistedHubConfig | null {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as PersistedHubConfig;
  } catch {
    hubLogger.error('[Hub] Failed to load hub config');
    return null;
  }
}

export function saveConfig(config: PersistedHubConfig): void {
  const configPath = getConfigPath();
  const dir = join(configPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function deleteConfig(): void {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    unlinkSync(configPath);
  }
}
