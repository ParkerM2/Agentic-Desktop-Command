/**
 * Email Store — SQLite-backed persistence for email configuration
 *
 * Migrates from legacy JSON file (email-config.json) on first access.
 * Config is stored in `settings_kv` with category='email' and key='default'.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';

import { settingsKv } from '../../../db/schema';
import { createScopedLogger } from '../../../lib/logger';

import { encryptSecret } from './email-encryption';

import type { EncryptedSecretEntry } from './email-encryption';
import type { AdcDatabase } from '../../../db';

const logger = createScopedLogger('email-store');

const SINGLETON_KEY = 'default';
const CATEGORY = 'email';

export interface StoredEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: EncryptedSecretEntry | string; // Support migration from plaintext
  from: string;
  provider?: string;
}

export interface EmailStoreData {
  config: StoredEmailConfig | null;
  queue: never[]; // Queue is now in emailQueue table — kept for JSON migration shape
}

/**
 * Migrate legacy email-config.json into SQLite settings_kv table.
 */
export function migrateEmailConfigFromJson(db: AdcDatabase, dataDir: string): boolean {
  // Check if SQLite already has config
  const existing = db
    .select()
    .from(settingsKv)
    .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
    .all();
  if (existing.length > 0) return false;

  const jsonPath = join(dataDir, 'email-config.json');
  if (!existsSync(jsonPath)) return false;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { config?: StoredEmailConfig | null };
    if (!parsed.config) return false;

    // Encrypt plaintext password during migration
    let { config } = parsed;
    if (typeof config.pass === 'string' && config.pass.length > 0) {
      config = { ...config, pass: encryptSecret(config.pass) };
    }

    db.insert(settingsKv)
      .values({
        id: generateId(),
        key: SINGLETON_KEY,
        category: CATEGORY,
        settings: config as unknown,
        updatedAt: new Date().toISOString(),
      })
      .run();

    logger.info('Migrated email config from JSON to SQLite');
    return true;
  } catch (err) {
    logger.error('Failed to migrate email config from JSON:', err);
    return false;
  }
}

/**
 * Load email configuration from SQLite.
 * Returns the stored config and whether a plaintext password migration is needed.
 */
export function loadEmailConfig(db: AdcDatabase): { config: StoredEmailConfig | null; needsMigration: boolean } {
  const rows = db
    .select()
    .from(settingsKv)
    .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
    .all();
  if (rows.length === 0) {
    return { config: null, needsMigration: false };
  }

  const stored = rows[0].settings as StoredEmailConfig;
  const needsMigration = typeof stored.pass === 'string' && stored.pass.length > 0;

  return { config: stored, needsMigration };
}

/**
 * Save email configuration to SQLite (upsert singleton row).
 */
export function saveEmailConfig(db: AdcDatabase, config: StoredEmailConfig | null): void {
  if (!config) {
    db.delete(settingsKv)
      .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
      .run();
    return;
  }

  // Encrypt plaintext password before persisting
  const toSave: StoredEmailConfig = {
    ...config,
    pass:
      typeof config.pass === 'string' && config.pass.length > 0
        ? encryptSecret(config.pass)
        : config.pass,
  };

  const existing = db
    .select()
    .from(settingsKv)
    .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
    .all();
  if (existing.length > 0) {
    db.update(settingsKv)
      .set({ settings: toSave as unknown, updatedAt: new Date().toISOString() })
      .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, SINGLETON_KEY)))
      .run();
  } else {
    db.insert(settingsKv)
      .values({
        id: generateId(),
        key: SINGLETON_KEY,
        category: CATEGORY,
        settings: toSave as unknown,
        updatedAt: new Date().toISOString(),
      })
      .run();
  }
}
