/**
 * Briefing Cache — Daily briefing storage backed by SQLite
 *
 * Uses the `briefings` table. One-time migration from briefings.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';
import type { DailyBriefing } from '@shared/types';

import { briefings } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

const logger = createScopedLogger('briefing-cache');

const MAX_STORED_BRIEFINGS = 30;

export interface BriefingCache {
  /** Get today's cached briefing, or null */
  getTodayBriefing: () => DailyBriefing | null;
  /** Store a briefing (replaces same-day, keeps last 30 days) */
  storeBriefing: (briefing: DailyBriefing) => void;
}

/**
 * Migrate briefings from the legacy JSON file into SQLite (one-time).
 */
function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(briefings).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'briefings.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { briefings?: DailyBriefing[] };
    const items = Array.isArray(parsed.briefings) ? parsed.briefings : [];

    for (const item of items) {
      db.insert(briefings)
        .values({
          id: generateId(),
          date: item.date,
          content: item as unknown,
          generatedAt: item.generatedAt,
        })
        .onConflictDoNothing()
        .run();
    }
    logger.info(`Migrated ${String(items.length)} briefings from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate briefings from JSON:', err);
  }
}

/**
 * Create a briefing cache backed by SQLite.
 */
export function createBriefingCache(db: AdcDatabase, dataDir: string): BriefingCache {
  // One-time migration from legacy JSON
  migrateFromJson(db, dataDir);

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0] ?? '';
  }

  return {
    getTodayBriefing() {
      const today = getTodayDate();
      const row = db.select().from(briefings).where(eq(briefings.date, today)).get();
      if (!row) return null;
      return row.content as DailyBriefing;
    },

    storeBriefing(briefing) {
      // Upsert: replace if same date exists
      db.insert(briefings)
        .values({
          id: generateId(),
          date: briefing.date,
          content: briefing as unknown,
          generatedAt: briefing.generatedAt,
        })
        .onConflictDoUpdate({
          target: briefings.date,
          set: {
            content: briefing as unknown,
            generatedAt: briefing.generatedAt,
          },
        })
        .run();

      // Prune old entries beyond MAX_STORED_BRIEFINGS
      const allDates = db
        .select({ date: briefings.date })
        .from(briefings)
        .orderBy(briefings.date)
        .all();

      if (allDates.length > MAX_STORED_BRIEFINGS) {
        const toDelete = allDates.slice(0, allDates.length - MAX_STORED_BRIEFINGS);
        for (const row of toDelete) {
          db.delete(briefings).where(eq(briefings.date, row.date)).run();
        }
      }
    },
  };
}
