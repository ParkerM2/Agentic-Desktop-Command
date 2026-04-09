/**
 * Briefing Config — Configuration loading and saving backed by SQLite
 *
 * Uses the `briefingConfig` table with a singleton row (key='default').
 * One-time migration from briefing-config.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import type { BriefingConfig } from '@shared/types';

import { briefingConfig } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

const logger = createScopedLogger('briefing-config');

const SINGLETON_KEY = 'default';

const DEFAULT_CONFIG: BriefingConfig = {
  enabled: true,
  scheduledTime: '09:00',
  includeGitHub: true,
  includeAgentActivity: true,
};

export interface BriefingConfigManager {
  /** Load config from SQLite (with defaults) */
  loadConfig: () => BriefingConfig;
  /** Save config to SQLite */
  saveConfig: (config: BriefingConfig) => void;
}

/**
 * Migrate config from the legacy JSON file into SQLite (one-time).
 */
function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db
    .select()
    .from(briefingConfig)
    .where(eq(briefingConfig.key, SINGLETON_KEY))
    .get();
  if (existing) return;

  const jsonPath = join(dataDir, 'briefing-config.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BriefingConfig>;
    const config: BriefingConfig = { ...DEFAULT_CONFIG, ...parsed };

    db.insert(briefingConfig)
      .values({
        key: SINGLETON_KEY,
        config: config as unknown,
        updatedAt: new Date().toISOString(),
      })
      .run();
    logger.info('Migrated briefing config from JSON to SQLite');
  } catch (err) {
    logger.error('Failed to migrate briefing config from JSON:', err);
  }
}

/**
 * Create a config manager for briefing settings backed by SQLite.
 */
export function createBriefingConfigManager(db: AdcDatabase, dataDir: string): BriefingConfigManager {
  // One-time migration from legacy JSON
  migrateFromJson(db, dataDir);

  function loadConfig(): BriefingConfig {
    const row = db
      .select()
      .from(briefingConfig)
      .where(eq(briefingConfig.key, SINGLETON_KEY))
      .get();

    if (!row) {
      return { ...DEFAULT_CONFIG };
    }

    return { ...DEFAULT_CONFIG, ...(row.config as Partial<BriefingConfig>) };
  }

  function saveConfig(config: BriefingConfig): void {
    db.insert(briefingConfig)
      .values({
        key: SINGLETON_KEY,
        config: config as unknown,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: briefingConfig.key,
        set: {
          config: config as unknown,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  return { loadConfig, saveConfig };
}
