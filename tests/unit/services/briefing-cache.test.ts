/**
 * Unit Tests for BriefingCache (SQLite-backed)
 *
 * Tests daily briefing storage, retrieval, deduplication, and capacity limits
 * using an in-memory SQLite database.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import type { DailyBriefing } from '@shared/types';

import * as schema from '@main/db/schema';

import { createBriefingCache } from '@main/features/briefing/briefing-cache';

import type { AdcDatabase } from '@main/db';

// ── Helpers ─────────────────────────────────────────────────────────

function createTestDb(): { db: AdcDatabase; close: () => void } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });

  // Create the briefings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS briefings (
      id TEXT,
      date TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      generated_at TEXT NOT NULL
    )
  `);

  return {
    db,
    close: () => sqlite.close(),
  };
}

function makeBriefing(overrides: Partial<DailyBriefing> = {}): DailyBriefing {
  return {
    id: 'briefing-1',
    date: '2026-02-19',
    summary: 'Test briefing summary',
    taskSummary: {
      dueToday: 3,
      completedYesterday: 5,
      overdue: 1,
      inProgress: 2,
    },
    agentActivity: {
      runningCount: 1,
      completedToday: 4,
      errorCount: 0,
    },
    suggestions: [],
    generatedAt: '2026-02-19T08:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('BriefingCache', () => {
  let db: AdcDatabase;
  let closeDb: () => void;
  const DATA_DIR = '/mock/data';

  beforeEach(() => {
    vi.clearAllMocks();
    const testDb = createTestDb();
    db = testDb.db;
    closeDb = testDb.close;
  });

  afterEach(() => {
    vi.useRealTimers();
    closeDb();
  });

  // ── getTodayBriefing() ────────────────────────────────────────────

  describe('getTodayBriefing()', () => {
    it('returns null when table is empty', () => {
      const cache = createBriefingCache(db, DATA_DIR);
      const result = cache.getTodayBriefing();

      expect(result).toBeNull();
    });

    it('returns null when no briefing matches today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const cache = createBriefingCache(db, DATA_DIR);
      const yesterdayBriefing = makeBriefing({ date: '2026-02-18' });
      cache.storeBriefing(yesterdayBriefing);

      const result = cache.getTodayBriefing();
      expect(result).toBeNull();
    });

    it("returns today's briefing when it exists", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const cache = createBriefingCache(db, DATA_DIR);
      const todayBriefing = makeBriefing({ date: '2026-02-19' });
      cache.storeBriefing(todayBriefing);

      const result = cache.getTodayBriefing();
      expect(result).not.toBeNull();
      expect(result?.date).toBe('2026-02-19');
      expect(result?.summary).toBe('Test briefing summary');
    });

    it('returns null when table is empty (no entries)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const cache = createBriefingCache(db, DATA_DIR);
      const result = cache.getTodayBriefing();

      expect(result).toBeNull();
    });
  });

  // ── storeBriefing() ───────────────────────────────────────────────

  describe('storeBriefing()', () => {
    it('stores a briefing in SQLite', () => {
      const cache = createBriefingCache(db, DATA_DIR);
      const briefing = makeBriefing();

      cache.storeBriefing(briefing);

      const rows = db.select().from(schema.briefings).all();
      expect(rows).toHaveLength(1);
      expect((rows[0].content as DailyBriefing).id).toBe('briefing-1');
    });

    it('replaces existing briefing for the same day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const cache = createBriefingCache(db, DATA_DIR);

      cache.storeBriefing(
        makeBriefing({
          id: 'old-briefing',
          date: '2026-02-19',
          summary: 'Old summary',
        }),
      );

      cache.storeBriefing(
        makeBriefing({
          id: 'new-briefing',
          date: '2026-02-19',
          summary: 'Updated summary',
        }),
      );

      const result = cache.getTodayBriefing();
      expect(result?.id).toBe('new-briefing');
      expect(result?.summary).toBe('Updated summary');

      // Verify only one row for that date
      const rows = db.select().from(schema.briefings).all();
      const sameDayRows = rows.filter((r) => r.date === '2026-02-19');
      expect(sameDayRows).toHaveLength(1);
    });

    it('preserves briefings from other days', () => {
      const cache = createBriefingCache(db, DATA_DIR);

      cache.storeBriefing(
        makeBriefing({ id: 'yesterday', date: '2026-02-18', summary: 'Yesterday' }),
      );
      cache.storeBriefing(
        makeBriefing({ id: 'today', date: '2026-02-19', summary: 'Today' }),
      );

      const rows = db.select().from(schema.briefings).all();
      expect(rows).toHaveLength(2);
    });

    it('caps stored briefings at 30 entries', () => {
      const cache = createBriefingCache(db, DATA_DIR);

      // Create 30 existing briefings
      for (let i = 0; i < 30; i++) {
        const day = String(i + 1).padStart(2, '0');
        cache.storeBriefing(
          makeBriefing({
            id: `briefing-${String(i)}`,
            date: `2026-01-${day}`,
            summary: `Summary ${String(i)}`,
          }),
        );
      }

      // Store one more — should prune the oldest
      cache.storeBriefing(
        makeBriefing({
          id: 'briefing-31',
          date: '2026-02-01',
          summary: 'Newest briefing',
        }),
      );

      const rows = db.select().from(schema.briefings).all();
      expect(rows).toHaveLength(30);
    });

    it('handles storing when table is empty', () => {
      const cache = createBriefingCache(db, DATA_DIR);
      cache.storeBriefing(makeBriefing());

      const rows = db.select().from(schema.briefings).all();
      expect(rows).toHaveLength(1);
    });
  });

  // ── Round-trip ────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('stored briefing can be retrieved for today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const cache = createBriefingCache(db, DATA_DIR);
      const briefing = makeBriefing({ date: '2026-02-19' });

      cache.storeBriefing(briefing);
      const result = cache.getTodayBriefing();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('briefing-1');
      expect(result?.date).toBe('2026-02-19');
      expect(result?.taskSummary.dueToday).toBe(3);
      expect(result?.agentActivity.runningCount).toBe(1);
    });

    it('multiple stores and reads maintain data integrity', () => {
      vi.useFakeTimers();

      const cache = createBriefingCache(db, DATA_DIR);

      // Store briefing for day 1
      vi.setSystemTime(new Date('2026-02-17T12:00:00.000Z'));
      cache.storeBriefing(makeBriefing({ id: 'b-17', date: '2026-02-17' }));

      // Store briefing for day 2
      vi.setSystemTime(new Date('2026-02-18T12:00:00.000Z'));
      cache.storeBriefing(makeBriefing({ id: 'b-18', date: '2026-02-18' }));

      // Store briefing for day 3
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));
      cache.storeBriefing(makeBriefing({ id: 'b-19', date: '2026-02-19' }));

      // Verify today's briefing is correct
      const today = cache.getTodayBriefing();
      expect(today?.id).toBe('b-19');

      // Verify all 3 are stored
      const rows = db.select().from(schema.briefings).all();
      expect(rows).toHaveLength(3);
    });
  });
});
