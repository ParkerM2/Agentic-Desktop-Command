/**
 * Briefing Config — Configuration loading and saving backed by SQLite
 *
 * Uses the `settings_kv` table with category='briefing' and key='default'.
 * One-time migration from briefing-config.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';
import type { BriefingConfig } from '@shared/types';

import { settingsKv } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

const logger = createScopedLogger('briefing-config');

const SINGLETON_KEY = 'default';
const CATEGORY = 'briefing';

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
    .from(settingsKv)
    .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
    .get();
  if (existing) return;

  const jsonPath = join(dataDir, 'briefing-config.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BriefingConfig>;
    const config: BriefingConfig = { ...DEFAULT_CONFIG, ...parsed };

    db.insert(settingsKv)
      .values({
        id: generateId(),
        key: SINGLETON_KEY,
        category: CATEGORY,
        settings: config as unknown,
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
      .from(settingsKv)
      .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
      .get();

    if (!row) {
      return { ...DEFAULT_CONFIG };
    }

    return { ...DEFAULT_CONFIG, ...(row.settings as Partial<BriefingConfig>) };
  }

  function saveConfig(config: BriefingConfig): void {
    db.insert(settingsKv)
      .values({
        id: generateId(),
        key: SINGLETON_KEY,
        category: CATEGORY,
        settings: config as unknown,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: settingsKv.key,
        set: {
          settings: config as unknown,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  return { loadConfig, saveConfig };
}
