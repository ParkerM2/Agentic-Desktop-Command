/**
 * Unit Tests for BriefingCache
 *
 * Tests daily briefing storage, retrieval, deduplication, capacity limits,
 * and corruption recovery. Mocks node:fs with memfs.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

import type { DailyBriefing } from '@shared/types';

// ── Path Mocking (use posix.join for memfs compatibility on Windows) ──

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
  };
});

// ── File System Mocking ────────────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;
  (globalThis as Record<string, unknown>).__mockFs = fs;

  return {
    default: fs,
    ...fs,
  };
});

// Import after mocks are set up
const { createBriefingCache } = await import(
  '@main/services/briefing/briefing-cache'
);

// ── Helpers ─────────────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const posixPath = filePath.replace(/\\/g, '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

const DATA_DIR = '/mock/data';
const BRIEFING_FILE = posix.join(DATA_DIR, 'briefings.json');

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
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  // ── getTodayBriefing() ────────────────────────────────────────────

  describe('getTodayBriefing()', () => {
    it('returns null when file does not exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const cache = createBriefingCache(BRIEFING_FILE);
      const result = cache.getTodayBriefing();

      expect(result).toBeNull();
    });

    it('returns null when no briefing matches today', () => {
      // Mock "today" to be 2026-02-19
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const yesterdayBriefing = makeBriefing({ date: '2026-02-18' });

      resetFs({
        [BRIEFING_FILE]: JSON.stringify({ briefings: [yesterdayBriefing] }),
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const result = cache.getTodayBriefing();

      expect(result).toBeNull();
    });

    it('returns today\'s briefing when it exists', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const todayBriefing = makeBriefing({ date: '2026-02-19' });

      resetFs({
        [BRIEFING_FILE]: JSON.stringify({ briefings: [todayBriefing] }),
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const result = cache.getTodayBriefing();

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2026-02-19');
      expect(result?.summary).toBe('Test briefing summary');
    });

    it('returns null when file contains invalid JSON', () => {
      resetFs({
        [BRIEFING_FILE]: 'not valid json {{{',
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const result = cache.getTodayBriefing();

      expect(result).toBeNull();
    });

    it('returns null when file contains empty briefings array', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      resetFs({
        [BRIEFING_FILE]: JSON.stringify({ briefings: [] }),
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const result = cache.getTodayBriefing();

      expect(result).toBeNull();
    });
  });

  // ── storeBriefing() ───────────────────────────────────────────────

  describe('storeBriefing()', () => {
    it('stores a briefing to disk', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const cache = createBriefingCache(BRIEFING_FILE);
      const briefing = makeBriefing();

      cache.storeBriefing(briefing);

      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.briefings).toHaveLength(1);
      expect(parsed.briefings[0].id).toBe('briefing-1');
    });

    it('replaces existing briefing for the same day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const oldBriefing = makeBriefing({
        id: 'old-briefing',
        date: '2026-02-19',
        summary: 'Old summary',
      });

      resetFs({
        [BRIEFING_FILE]: JSON.stringify({ briefings: [oldBriefing] }),
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const newBriefing = makeBriefing({
        id: 'new-briefing',
        date: '2026-02-19',
        summary: 'Updated summary',
      });

      cache.storeBriefing(newBriefing);

      const result = cache.getTodayBriefing();

      expect(result?.id).toBe('new-briefing');
      expect(result?.summary).toBe('Updated summary');

      // Verify only one briefing for that date
      const vol = getMockVol();
      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);
      const sameDayBriefings = parsed.briefings.filter(
        (b: DailyBriefing) => b.date === '2026-02-19',
      );

      expect(sameDayBriefings).toHaveLength(1);
    });

    it('preserves briefings from other days', () => {
      const yesterdayBriefing = makeBriefing({
        id: 'yesterday',
        date: '2026-02-18',
        summary: 'Yesterday',
      });

      resetFs({
        [BRIEFING_FILE]: JSON.stringify({ briefings: [yesterdayBriefing] }),
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const todayBriefing = makeBriefing({
        id: 'today',
        date: '2026-02-19',
        summary: 'Today',
      });

      cache.storeBriefing(todayBriefing);

      const vol = getMockVol();
      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.briefings).toHaveLength(2);
      expect(parsed.briefings[0].date).toBe('2026-02-18');
      expect(parsed.briefings[1].date).toBe('2026-02-19');
    });

    it('caps stored briefings at 30 entries', () => {
      // Create 30 existing briefings
      const existingBriefings = Array.from({ length: 30 }, (_, i) => {
        const day = String(i + 1).padStart(2, '0');
        return makeBriefing({
          id: `briefing-${String(i)}`,
          date: `2026-01-${day}`,
          summary: `Summary ${String(i)}`,
        });
      });

      resetFs({
        [BRIEFING_FILE]: JSON.stringify({ briefings: existingBriefings }),
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const newBriefing = makeBriefing({
        id: 'briefing-31',
        date: '2026-02-01',
        summary: 'Newest briefing',
      });

      cache.storeBriefing(newBriefing);

      const vol = getMockVol();
      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.briefings).toHaveLength(30);
      // Oldest entry should have been dropped (slice keeps last 30)
      expect(parsed.briefings[0].id).toBe('briefing-1');
      expect(parsed.briefings[29].id).toBe('briefing-31');
    });

    it('writes pretty-printed JSON', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const cache = createBriefingCache(BRIEFING_FILE);
      cache.storeBriefing(makeBriefing());

      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;

      expect(raw).toContain('\n');
      // Should be valid JSON
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('handles storing when file does not exist yet', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });
      // Do NOT create BRIEFING_FILE — storeBriefing should create it

      const cache = createBriefingCache(BRIEFING_FILE);
      cache.storeBriefing(makeBriefing());

      expect(vol.existsSync(BRIEFING_FILE)).toBe(true);

      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.briefings).toHaveLength(1);
    });
  });

  // ── Corruption Recovery ───────────────────────────────────────────

  describe('corruption recovery', () => {
    it('recovers from corrupted JSON file on read', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      resetFs({
        [BRIEFING_FILE]: 'corrupted data {{{!!!',
      });

      const cache = createBriefingCache(BRIEFING_FILE);

      // Should not throw, returns null
      const result = cache.getTodayBriefing();
      expect(result).toBeNull();
    });

    it('recovers from corrupted file on store (overwrites with valid data)', () => {
      resetFs({
        [BRIEFING_FILE]: 'corrupted data {{{!!!',
      });

      const cache = createBriefingCache(BRIEFING_FILE);
      const briefing = makeBriefing();

      // Store should succeed — it loads (gets empty), then writes fresh
      cache.storeBriefing(briefing);

      const vol = getMockVol();
      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);

      expect(parsed.briefings).toHaveLength(1);
      expect(parsed.briefings[0].id).toBe('briefing-1');
    });

    it('throws when file contains non-object JSON (known edge case)', () => {
      resetFs({
        [BRIEFING_FILE]: JSON.stringify('just a string'),
      });

      const cache = createBriefingCache(BRIEFING_FILE);

      // loadBriefings parses successfully, but `briefings` property is undefined.
      // Calling `.find()` on undefined throws a TypeError.
      expect(() => cache.getTodayBriefing()).toThrow(TypeError);
    });
  });

  // ── Round-trip ────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('stored briefing can be retrieved for today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));

      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const cache = createBriefingCache(BRIEFING_FILE);
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

      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const cache = createBriefingCache(BRIEFING_FILE);

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
      const raw = vol.readFileSync(BRIEFING_FILE, 'utf-8') as string;
      const parsed = JSON.parse(raw);
      expect(parsed.briefings).toHaveLength(3);
    });
  });
});
