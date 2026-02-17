/**
 * Unit Tests for ErrorCollector
 *
 * Tests error collection, persistence, pruning, stats, and capacity alerts.
 * Mocks node:fs and the safeWriteJson utility to avoid touching real disk.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

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

// Mock safeWriteJson to track calls without real I/O
const mockSafeWriteJson = vi.fn();
vi.mock('@main/lib/safe-write-json', () => ({
  safeWriteJson: mockSafeWriteJson,
}));

// Import after mocks are set up
const { createErrorCollector } = await import('@main/services/health/error-collector');

// ── Helpers ─────────────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    // Use forward slashes for memfs compatibility on Windows
    const posixPath = filePath.replace(/\\/g, '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

const DATA_DIR = '/mock/data';
const LOG_FILE = posix.join(DATA_DIR, 'error-log.json');

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-id',
    timestamp: new Date().toISOString(),
    severity: 'error',
    tier: 'app',
    category: 'general',
    message: 'test error',
    context: {},
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ErrorCollector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  // ── report() ────────────────────────────────────────────────────

  describe('report()', () => {
    it('creates an ErrorEntry with a unique ID and correct timestamp', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

      const collector = createErrorCollector(DATA_DIR);
      const entry = collector.report({
        severity: 'error',
        tier: 'app',
        category: 'general',
        message: 'Something broke',
        stack: 'Error: Something broke\n  at foo.ts:1',
      });

      expect(entry.id).toBeTruthy();
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.severity).toBe('error');
      expect(entry.tier).toBe('app');
      expect(entry.category).toBe('general');
      expect(entry.message).toBe('Something broke');
      expect(entry.stack).toBe('Error: Something broke\n  at foo.ts:1');
      expect(entry.timestamp).toBeTruthy();
      expect(entry.context).toEqual({});
    });

    it('increments session error count', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const onCapacityAlert = vi.fn();
      const collector = createErrorCollector(DATA_DIR, { onCapacityAlert });

      // Report fewer than threshold — no alert
      for (let i = 0; i < 10; i++) {
        collector.report({
          severity: 'warning',
          tier: 'project',
          category: 'service',
          message: `Error ${String(i)}`,
        });
      }

      expect(onCapacityAlert).not.toHaveBeenCalled();
    });

    it('persists entries via safeWriteJson on each report', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      collector.report({
        severity: 'info',
        tier: 'personal',
        category: 'renderer',
        message: 'test',
      });

      expect(mockSafeWriteJson).toHaveBeenCalledWith(
        LOG_FILE,
        expect.arrayContaining([
          expect.objectContaining({ message: 'test' }),
        ]),
      );
    });

    it('uses provided context when present', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      const entry = collector.report({
        severity: 'error',
        tier: 'project',
        category: 'agent',
        message: 'agent error',
        context: { route: '/tasks', projectId: 'proj-1' },
      });

      expect(entry.context).toEqual({ route: '/tasks', projectId: 'proj-1' });
    });

    it('defaults context to empty object when not provided', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      const entry = collector.report({
        severity: 'error',
        tier: 'app',
        category: 'general',
        message: 'no context',
      });

      expect(entry.context).toEqual({});
    });

    it('fires onError callback on each report', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const onError = vi.fn();
      const collector = createErrorCollector(DATA_DIR, { onError });

      const entry = collector.report({
        severity: 'error',
        tier: 'app',
        category: 'general',
        message: 'callback test',
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(entry);
    });
  });

  // ── getLog() ────────────────────────────────────────────────────

  describe('getLog()', () => {
    it('returns all entries when no since parameter', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      collector.report({ severity: 'error', tier: 'app', category: 'general', message: 'one' });
      collector.report({ severity: 'warning', tier: 'project', category: 'service', message: 'two' });

      const log = collector.getLog();

      expect(log).toHaveLength(2);
      expect(log[0]?.message).toBe('one');
      expect(log[1]?.message).toBe('two');
    });

    it('returns a copy of the entries array (not a reference)', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      collector.report({ severity: 'error', tier: 'app', category: 'general', message: 'test' });

      const log1 = collector.getLog();
      const log2 = collector.getLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });

    it('filters by since parameter', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      // Seed with existing entries at known timestamps
      const oldTimestamp = '2026-01-01T00:00:00.000Z';
      const newTimestamp = '2026-02-15T12:00:00.000Z';

      resetFs({
        [LOG_FILE]: JSON.stringify([
          makeEntry({ id: 'old-1', timestamp: oldTimestamp, message: 'old entry' }),
          makeEntry({ id: 'new-1', timestamp: newTimestamp, message: 'new entry' }),
        ]),
      });

      const collector = createErrorCollector(DATA_DIR);
      const filtered = collector.getLog('2026-02-01T00:00:00.000Z');

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.message).toBe('new entry');
    });
  });

  // ── getStats() ──────────────────────────────────────────────────

  describe('getStats()', () => {
    it('calculates total, byTier, bySeverity, and last24h', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const recentTimestamp = new Date(now - 1000).toISOString();
      const oldTimestamp = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

      resetFs({
        [LOG_FILE]: JSON.stringify([
          makeEntry({ id: '1', severity: 'error', tier: 'app', timestamp: recentTimestamp }),
          makeEntry({ id: '2', severity: 'warning', tier: 'project', timestamp: recentTimestamp }),
          makeEntry({ id: '3', severity: 'info', tier: 'personal', timestamp: oldTimestamp }),
          makeEntry({ id: '4', severity: 'error', tier: 'app', timestamp: oldTimestamp }),
        ]),
      });

      const collector = createErrorCollector(DATA_DIR);
      const stats = collector.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byTier).toEqual({ app: 2, project: 1, personal: 1 });
      expect(stats.bySeverity).toEqual({ error: 2, warning: 1, info: 1 });
      expect(stats.last24h).toBe(2);
    });

    it('returns zeroed stats when no entries exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      const stats = collector.getStats();

      expect(stats).toEqual({
        total: 0,
        byTier: { app: 0, project: 0, personal: 0 },
        bySeverity: { error: 0, warning: 0, info: 0 },
        last24h: 0,
      });
    });
  });

  // ── clear() ─────────────────────────────────────────────────────

  describe('clear()', () => {
    it('empties entries and resets session counter', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const onCapacityAlert = vi.fn();
      const collector = createErrorCollector(DATA_DIR, { onCapacityAlert });

      // Add some entries
      for (let i = 0; i < 5; i++) {
        collector.report({ severity: 'error', tier: 'app', category: 'general', message: `err ${String(i)}` });
      }

      collector.clear();

      expect(collector.getLog()).toEqual([]);
      expect(collector.getStats().total).toBe(0);

      // After clear, session count should be reset — reporting 49 more should not alert
      for (let i = 0; i < 49; i++) {
        collector.report({ severity: 'error', tier: 'app', category: 'general', message: `post-clear ${String(i)}` });
      }

      // Only 49 — threshold is 50
      expect(onCapacityAlert).not.toHaveBeenCalled();
    });

    it('persists cleared state via safeWriteJson', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      collector.report({ severity: 'error', tier: 'app', category: 'general', message: 'test' });

      mockSafeWriteJson.mockClear();
      collector.clear();

      expect(mockSafeWriteJson).toHaveBeenCalledWith(LOG_FILE, []);
    });
  });

  // ── Pruning ─────────────────────────────────────────────────────

  describe('pruning', () => {
    it('removes entries older than 7 days on initialization', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();

      resetFs({
        [LOG_FILE]: JSON.stringify([
          makeEntry({ id: 'old', timestamp: eightDaysAgo, message: 'old' }),
          makeEntry({ id: 'recent', timestamp: oneDayAgo, message: 'recent' }),
        ]),
      });

      const collector = createErrorCollector(DATA_DIR);
      const log = collector.getLog();

      expect(log).toHaveLength(1);
      expect(log[0]?.message).toBe('recent');
    });

    it('persists pruned entries to disk', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

      resetFs({
        [LOG_FILE]: JSON.stringify([
          makeEntry({ id: 'old', timestamp: eightDaysAgo }),
        ]),
      });

      mockSafeWriteJson.mockClear();
      createErrorCollector(DATA_DIR);

      // safeWriteJson should be called during pruning
      expect(mockSafeWriteJson).toHaveBeenCalledWith(LOG_FILE, []);
    });

    it('does not persist if no entries were pruned', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();

      resetFs({
        [LOG_FILE]: JSON.stringify([
          makeEntry({ id: 'recent', timestamp: oneDayAgo }),
        ]),
      });

      mockSafeWriteJson.mockClear();
      createErrorCollector(DATA_DIR);

      // No pruning needed, no safeWriteJson call during init
      expect(mockSafeWriteJson).not.toHaveBeenCalled();
    });
  });

  // ── Capacity Alert ──────────────────────────────────────────────

  describe('capacity alert', () => {
    it('fires onCapacityAlert when session count reaches 50', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const onCapacityAlert = vi.fn();
      const collector = createErrorCollector(DATA_DIR, { onCapacityAlert });

      // Report exactly 49 — no alert
      for (let i = 0; i < 49; i++) {
        collector.report({ severity: 'error', tier: 'app', category: 'general', message: `err ${String(i)}` });
      }
      expect(onCapacityAlert).not.toHaveBeenCalled();

      // 50th report triggers alert
      collector.report({ severity: 'error', tier: 'app', category: 'general', message: 'err 50' });
      expect(onCapacityAlert).toHaveBeenCalledTimes(1);
      expect(onCapacityAlert).toHaveBeenCalledWith(
        50,
        expect.stringContaining('50'),
      );
    });

    it('fires on every report at or above threshold', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const onCapacityAlert = vi.fn();
      const collector = createErrorCollector(DATA_DIR, { onCapacityAlert });

      for (let i = 0; i < 52; i++) {
        collector.report({ severity: 'error', tier: 'app', category: 'general', message: `err ${String(i)}` });
      }

      // Fires on reports 50, 51, 52
      expect(onCapacityAlert).toHaveBeenCalledTimes(3);
    });
  });

  // ── Corrupted File ──────────────────────────────────────────────

  describe('corrupted file handling', () => {
    it('starts with empty log if JSON file is corrupted', () => {
      resetFs({
        [LOG_FILE]: 'this is not valid json {{{',
      });

      const collector = createErrorCollector(DATA_DIR);
      const log = collector.getLog();

      expect(log).toEqual([]);
    });

    it('starts with empty log if file contains non-array JSON', () => {
      resetFs({
        [LOG_FILE]: JSON.stringify({ not: 'an array' }),
      });

      const collector = createErrorCollector(DATA_DIR);
      const log = collector.getLog();

      expect(log).toEqual([]);
    });
  });

  // ── Data Directory ──────────────────────────────────────────────

  describe('data directory initialization', () => {
    it('creates data directory if it does not exist', () => {
      const vol = getMockVol();
      expect(vol.existsSync('/new/data/dir')).toBe(false);

      createErrorCollector('/new/data/dir');

      expect(vol.existsSync('/new/data/dir')).toBe(true);
    });
  });

  // ── dispose() ───────────────────────────────────────────────────

  describe('dispose()', () => {
    it('persists remaining entries on dispose', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);
      collector.report({ severity: 'error', tier: 'app', category: 'general', message: 'dispose test' });

      mockSafeWriteJson.mockClear();
      collector.dispose();

      expect(mockSafeWriteJson).toHaveBeenCalledWith(
        LOG_FILE,
        expect.arrayContaining([
          expect.objectContaining({ message: 'dispose test' }),
        ]),
      );
    });

    it('does not persist if no entries exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const collector = createErrorCollector(DATA_DIR);

      mockSafeWriteJson.mockClear();
      collector.dispose();

      expect(mockSafeWriteJson).not.toHaveBeenCalled();
    });
  });
});
