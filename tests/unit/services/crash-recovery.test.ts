/**
 * Unit Tests for Crash Recovery Service
 *
 * Tests recovery of orphaned hooks, progress files, and QA directories.
 * Uses memfs for file system mocking.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// Mock logger
vi.mock('@main/lib/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  serviceLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ── Path Mocking ────────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return { ...original, join: original.posix.join };
});

// ── File System Mocking ─────────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return { default: fs, ...fs };
});

const { createCrashRecovery } = await import(
  '@main/services/data-management/crash-recovery'
);

// ── Helpers ─────────────────────────────────────────────────────

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

// ── Tests ───────────────────────────────────────────────────────

describe('CrashRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  describe('recover() — no artifacts', () => {
    it('returns zero fixes when no orphaned artifacts exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(0);
      expect(result.details).toEqual([]);
    });
  });

  describe('recover() — orphaned hooks', () => {
    it('removes ADC hooks from settings.local.json when no active session for project', () => {
      const projectPath = '/mock/project';
      const settingsPath = posix.join(projectPath, '.claude', 'settings.local.json');
      const progressDir = posix.join(DATA_DIR, 'progress');

      const settings = {
        hooks: {
          PostToolUse: [
            { command: `echo "done" >> ${progressDir}/task.jsonl` },
          ],
        },
      };

      resetFs({
        [settingsPath]: JSON.stringify(settings),
      });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [projectPath],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(1);
      expect(result.details.length).toBeGreaterThan(0);
    });

    it('does not remove hooks when active session uses the project', () => {
      const projectPath = '/mock/project';
      const settingsPath = posix.join(projectPath, '.claude', 'settings.local.json');
      const progressDir = posix.join(DATA_DIR, 'progress');

      const settings = {
        hooks: {
          PostToolUse: [
            { command: `echo "done" >> ${progressDir}/task.jsonl` },
          ],
        },
      };

      resetFs({
        [settingsPath]: JSON.stringify(settings),
      });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [projectPath],
        listActiveSessions: () => [{ projectPath }],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(0);
    });

    it('skips projects without settings.local.json', () => {
      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => ['/mock/no-settings'],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(0);
    });

    it('skips malformed JSON in settings.local.json', () => {
      const projectPath = '/mock/project';
      const settingsPath = posix.join(projectPath, '.claude', 'settings.local.json');

      resetFs({
        [settingsPath]: '{invalid json!!!',
      });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [projectPath],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(0);
    });

    it('keeps non-ADC hooks when removing ADC hooks', () => {
      const projectPath = '/mock/project';
      const settingsPath = posix.join(projectPath, '.claude', 'settings.local.json');
      const progressDir = posix.join(DATA_DIR, 'progress');

      const settings = {
        hooks: {
          PostToolUse: [
            { command: `echo "done" >> ${progressDir}/task.jsonl` },
            { command: 'echo "user hook"' },
          ],
        },
      };

      resetFs({
        [settingsPath]: JSON.stringify(settings),
      });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [projectPath],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(1);

      // Check that the file still has the user hook
      const vol = getMockVol();
      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string) as Record<string, unknown>;
      const hooks = content.hooks as Record<string, unknown[]>;
      expect(hooks.PostToolUse).toHaveLength(1);
    });
  });

  describe('recover() — orphaned progress files', () => {
    it('removes progress files older than 24h with no active session', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const progressDir = posix.join(DATA_DIR, 'progress');
      const oldFile = posix.join(progressDir, 'old-task.jsonl');

      const vol = getMockVol();
      vol.mkdirSync(progressDir, { recursive: true });
      vol.writeFileSync(oldFile, 'some data');

      // Make the file appear old by patching statSync time
      // memfs sets mtime to now, so we need to mock Date.now to be in the future
      const twoDaysLater = now + 2 * 24 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(twoDaysLater);

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBeGreaterThanOrEqual(1);
      expect(vol.existsSync(oldFile)).toBe(false);
    });

    it('does not remove non-.jsonl/.log files', () => {
      const progressDir = posix.join(DATA_DIR, 'progress');
      const otherFile = posix.join(progressDir, 'readme.txt');

      const vol = getMockVol();
      vol.mkdirSync(progressDir, { recursive: true });
      vol.writeFileSync(otherFile, 'data');

      const now = Date.now() + 2 * 24 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(vol.existsSync(otherFile)).toBe(true);
      // Only hook recovery would have been attempted, no progress file cleanup for .txt
      expect(result.details.filter((d) => d.includes('progress file')).length).toBe(0);
    });

    it('returns 0 when progress dir does not exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(0);
    });
  });

  describe('recover() — orphaned QA directories', () => {
    it('removes QA directories older than 7 days', () => {
      const now = Date.now();

      const qaDir = posix.join(DATA_DIR, 'qa');
      const oldTaskDir = posix.join(qaDir, 'old-task');

      const vol = getMockVol();
      vol.mkdirSync(oldTaskDir, { recursive: true });
      vol.writeFileSync(posix.join(oldTaskDir, 'report.json'), '{}');

      // Make it 8 days in the future
      const eightDaysLater = now + 8 * 24 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(eightDaysLater);

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBeGreaterThanOrEqual(1);
      expect(vol.existsSync(oldTaskDir)).toBe(false);
    });

    it('keeps QA directories younger than 7 days', () => {
      // Restore real Date.now so memfs mtime is "now" and the age check sees 0ms
      vi.spyOn(Date, 'now').mockRestore();

      const qaDir = posix.join(DATA_DIR, 'qa');
      const recentDir = posix.join(qaDir, 'recent-task');

      const vol = getMockVol();
      vol.mkdirSync(recentDir, { recursive: true });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(vol.existsSync(recentDir)).toBe(true);
    });

    it('returns 0 when QA dir does not exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const recovery = createCrashRecovery({
        dataDir: DATA_DIR,
        listProjectPaths: () => [],
        listActiveSessions: () => [],
      });

      const result = recovery.recover();
      expect(result.fixed).toBe(0);
    });
  });
});
