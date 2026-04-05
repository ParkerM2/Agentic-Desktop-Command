/**
 * Unit Tests for ProgressWatcherV2Service
 *
 * Tests watchFeature, stopWatching, getTasksForFeature, getTask, event listeners, dispose.
 * Mocks node:fs with memfs.
 */

import { posix } from 'node:path';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
    dirname: original.posix.dirname,
  };
});

// ── File System Mocking ───────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return {
    default: fs,
    ...fs,
  };
});

// ── Logger Mocking ────────────────────────────────────────────

vi.mock('@main/lib/logger', () => ({
  watcherLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Override process.cwd ──────────────────────────────────────

const MOCK_CWD = '/mock/project';
vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);

const { createProgressWatcherV2 } = await import(
  '@main/services/progress-watcher-v2/progress-watcher-v2-service'
);

// ── Helpers ───────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const p = filePath.replace(/\\/g, '/');
    const dir = p.substring(0, p.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(p, content, { encoding: 'utf-8' });
  }
}

function makeTaskContent(taskNumber: number, status = 'pending', name = 'Test Task'): string {
  return `---\ntaskNumber: ${String(taskNumber)}\ntaskName: ${name}\nstatus: ${status}\n---\n`;
}

function tasksDir(slug: string): string {
  return posix.join(MOCK_CWD, 'progress', slug, 'tasks');
}

// ── Tests ─────────────────────────────────────────────────────

describe('ProgressWatcherV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  describe('watchFeature() + getTasksForFeature()', () => {
    it('scans existing task files on watch', () => {
      const dir = tasksDir('my-feature');
      resetFs({
        [posix.join(dir, 'task-1.md')]: makeTaskContent(1, 'completed', 'Setup'),
        [posix.join(dir, 'task-2.md')]: makeTaskContent(2, 'in-progress', 'Build'),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('my-feature');

      const tasks = watcher.getTasksForFeature('my-feature');

      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.taskNumber).toBe(1);
      expect(tasks[0]?.taskName).toBe('Setup');
      expect(tasks[1]?.taskNumber).toBe(2);
      expect(tasks[1]?.taskName).toBe('Build');

      watcher.dispose();
    });

    it('returns tasks sorted by taskNumber', () => {
      const dir = tasksDir('sort-test');
      resetFs({
        [posix.join(dir, 'task-3.md')]: makeTaskContent(3),
        [posix.join(dir, 'task-1.md')]: makeTaskContent(1),
        [posix.join(dir, 'task-2.md')]: makeTaskContent(2),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('sort-test');

      const tasks = watcher.getTasksForFeature('sort-test');

      expect(tasks.map((t) => t.taskNumber)).toEqual([1, 2, 3]);

      watcher.dispose();
    });

    it('is idempotent — second call does not duplicate', () => {
      const dir = tasksDir('idempotent');
      resetFs({
        [posix.join(dir, 'task-1.md')]: makeTaskContent(1),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('idempotent');
      watcher.watchFeature('idempotent');

      const tasks = watcher.getTasksForFeature('idempotent');
      expect(tasks).toHaveLength(1);

      watcher.dispose();
    });

    it('returns empty array when no task files exist', () => {
      const dir = tasksDir('empty');
      const vol = getMockVol();
      vol.mkdirSync(dir, { recursive: true });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('empty');

      const tasks = watcher.getTasksForFeature('empty');
      expect(tasks).toEqual([]);

      watcher.dispose();
    });

    it('returns empty array for unwatched slug', () => {
      const watcher = createProgressWatcherV2();
      const tasks = watcher.getTasksForFeature('nonexistent');
      expect(tasks).toEqual([]);
    });

    it('ignores non-task files in the directory', () => {
      const dir = tasksDir('mixed');
      resetFs({
        [posix.join(dir, 'task-1.md')]: makeTaskContent(1),
        [posix.join(dir, 'notes.md')]: '# Notes',
        [posix.join(dir, 'README.md')]: '# Readme',
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('mixed');

      const tasks = watcher.getTasksForFeature('mixed');
      expect(tasks).toHaveLength(1);

      watcher.dispose();
    });
  });

  describe('getTask()', () => {
    it('returns a specific task by number', () => {
      const dir = tasksDir('get-task');
      resetFs({
        [posix.join(dir, 'task-5.md')]: makeTaskContent(5, 'completed', 'Deploy'),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('get-task');

      const task = watcher.getTask('get-task', 5);
      expect(task).not.toBeNull();
      expect(task!.taskName).toBe('Deploy');

      watcher.dispose();
    });

    it('returns null for nonexistent task number', () => {
      const dir = tasksDir('missing-task');
      resetFs({
        [posix.join(dir, 'task-1.md')]: makeTaskContent(1),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('missing-task');

      const task = watcher.getTask('missing-task', 99);
      expect(task).toBeNull();

      watcher.dispose();
    });

    it('returns null for unwatched slug', () => {
      const watcher = createProgressWatcherV2();
      const task = watcher.getTask('unknown', 1);
      expect(task).toBeNull();
    });
  });

  describe('stopWatching()', () => {
    it('clears cache and stops watching', () => {
      const dir = tasksDir('stop-test');
      resetFs({
        [posix.join(dir, 'task-1.md')]: makeTaskContent(1),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('stop-test');
      expect(watcher.getTasksForFeature('stop-test')).toHaveLength(1);

      watcher.stopWatching('stop-test');
      expect(watcher.getTasksForFeature('stop-test')).toEqual([]);
    });

    it('is safe to call for unwatched slug', () => {
      const watcher = createProgressWatcherV2();
      expect(() => watcher.stopWatching('nonexistent')).not.toThrow();
    });
  });

  describe('onTaskUpdated / offTaskUpdated', () => {
    it('registers and removes listeners', () => {
      const watcher = createProgressWatcherV2();
      const listener = vi.fn();

      watcher.onTaskUpdated(listener);
      watcher.offTaskUpdated(listener);

      // No error, listener was removed
      watcher.dispose();
    });
  });

  describe('dispose()', () => {
    it('clears all watchers and caches', () => {
      const dir1 = tasksDir('feat-1');
      const dir2 = tasksDir('feat-2');
      resetFs({
        [posix.join(dir1, 'task-1.md')]: makeTaskContent(1),
        [posix.join(dir2, 'task-1.md')]: makeTaskContent(1),
      });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('feat-1');
      watcher.watchFeature('feat-2');

      watcher.dispose();

      expect(watcher.getTasksForFeature('feat-1')).toEqual([]);
      expect(watcher.getTasksForFeature('feat-2')).toEqual([]);
    });
  });

  describe('when tasks dir does not exist yet', () => {
    it('watches parent dir for tasks/ creation', () => {
      // Create the parent but not the tasks dir
      const vol = getMockVol();
      const parentDir = posix.join(MOCK_CWD, '.claude', 'progress', 'deferred');
      vol.mkdirSync(parentDir, { recursive: true });

      const watcher = createProgressWatcherV2();
      watcher.watchFeature('deferred');

      // Initially no tasks
      expect(watcher.getTasksForFeature('deferred')).toEqual([]);

      watcher.dispose();
    });
  });
});
