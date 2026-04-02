/**
 * ProgressWatcherV2 Service
 *
 * Watches `.claude/progress/<slug>/tasks/task-*.md` files for real-time task state.
 * Parses YAML frontmatter and markdown checklists into TaskProgress objects.
 * Emits taskUpdated events when task files change.
 *
 * Separate from the existing ProgressWatcher (which syncs to Hub).
 * This service is for dashboard consumption only.
 */

import { existsSync, readdirSync, readFileSync, watch } from 'node:fs';
import { dirname, join } from 'node:path';

import type { TaskProgress } from '@shared/types/agent-dashboard';

import { watcherLogger } from '@main/lib/logger';

import { extractTaskNumber, parseTaskFile } from './task-file-parser';

import type { FSWatcher } from 'node:fs';

// ─── Types ──────────────────────────────────────────────────

export type TaskUpdatedListener = (slug: string, task: TaskProgress) => void;

export interface ProgressWatcherV2 {
  watchFeature: (slug: string) => void;
  stopWatching: (slug: string) => void;
  getTasksForFeature: (slug: string) => TaskProgress[];
  getTask: (slug: string, taskNumber: number) => TaskProgress | null;
  onTaskUpdated: (listener: TaskUpdatedListener) => void;
  offTaskUpdated: (listener: TaskUpdatedListener) => void;
  dispose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

function getTasksDir(slug: string): string {
  return join(process.cwd(), '.claude', 'progress', slug, 'tasks');
}

function isTaskFile(filename: string): boolean {
  return /^task-\d+\.md$/.test(filename);
}

function readAndParseTask(filePath: string): TaskProgress | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseTaskFile(content);
  } catch {
    return null;
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createProgressWatcherV2(): ProgressWatcherV2 {
  const watchers = new Map<string, FSWatcher>();
  const parentWatchers = new Map<string, FSWatcher>();
  const taskCache = new Map<string, Map<number, TaskProgress>>();
  const listeners = new Set<TaskUpdatedListener>();
  const watchedSlugs = new Set<string>();

  function notifyListeners(slug: string, task: TaskProgress): void {
    for (const listener of listeners) {
      listener(slug, task);
    }
  }

  function getOrCreateCache(slug: string): Map<number, TaskProgress> {
    let cache = taskCache.get(slug);
    if (!cache) {
      cache = new Map<number, TaskProgress>();
      taskCache.set(slug, cache);
    }
    return cache;
  }

  function scanExistingTasks(slug: string, tasksDir: string): void {
    try {
      const files = readdirSync(tasksDir);
      const cache = getOrCreateCache(slug);

      for (const file of files) {
        if (!isTaskFile(file)) {
          continue;
        }
        const filePath = join(tasksDir, file);
        const task = readAndParseTask(filePath);
        if (task) {
          cache.set(task.taskNumber, task);
        }
      }
    } catch {
      watcherLogger.error(`[ProgressWatcherV2] Failed to scan tasks for slug: ${slug}`);
    }
  }

  function handleFileChange(slug: string, tasksDir: string, filename: string | null): void {
    if (!filename || !isTaskFile(filename)) {
      return;
    }

    const filePath = join(tasksDir, filename);
    if (!existsSync(filePath)) {
      // File was deleted — remove from cache
      const taskNum = extractTaskNumber(filename);
      if (taskNum !== null) {
        const cache = taskCache.get(slug);
        cache?.delete(taskNum);
      }
      return;
    }

    const task = readAndParseTask(filePath);
    if (task) {
      const cache = getOrCreateCache(slug);
      cache.set(task.taskNumber, task);
      notifyListeners(slug, task);
    }
  }

  function setupTasksDirWatcher(slug: string, tasksDir: string): void {
    watcherLogger.info(`[ProgressWatcherV2] Watching ${tasksDir}`);

    // Scan existing files on start
    scanExistingTasks(slug, tasksDir);

    try {
      const watcher = watch(tasksDir, (_eventType, filename) => {
        handleFileChange(slug, tasksDir, filename);
      });

      watcher.on('error', (err) => {
        watcherLogger.error(`[ProgressWatcherV2] Watch error for ${slug}:`, err.message);
      });

      watchers.set(slug, watcher);
      watchedSlugs.add(slug);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      watcherLogger.error(`[ProgressWatcherV2] Failed to start watching ${slug}:`, message);
      watchedSlugs.delete(slug);
    }
  }

  function watchParentForTasksDir(slug: string, tasksDir: string): void {
    const parentDir = dirname(tasksDir);

    if (!existsSync(parentDir)) {
      watcherLogger.info(
        `[ProgressWatcherV2] Parent dir does not exist either: ${parentDir}`,
      );
      watchedSlugs.delete(slug);
      return;
    }

    try {
      const parentWatcher = watch(parentDir, (eventType, filename) => {
        if (eventType === 'rename' && filename === 'tasks' && existsSync(tasksDir)) {
          // tasks directory appeared — clean up parent watcher and set up real watcher
          parentWatcher.close();
          parentWatchers.delete(slug);
          setupTasksDirWatcher(slug, tasksDir);
        }
      });

      parentWatcher.on('error', (err) => {
        watcherLogger.error(`[ProgressWatcherV2] Parent watch error for ${slug}:`, err.message);
      });

      parentWatchers.set(slug, parentWatcher);
      watcherLogger.info(
        `[ProgressWatcherV2] Watching parent dir for tasks/ creation: ${parentDir}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      watcherLogger.error(`[ProgressWatcherV2] Failed to watch parent for ${slug}:`, message);
      watchedSlugs.delete(slug);
    }
  }

  return {
    watchFeature(slug: string): void {
      if (watchedSlugs.has(slug)) {
        return;
      }
      watchedSlugs.add(slug);

      const tasksDir = getTasksDir(slug);

      if (!existsSync(tasksDir)) {
        watcherLogger.info(
          `[ProgressWatcherV2] Tasks dir does not exist yet: ${tasksDir}`,
        );
        watchParentForTasksDir(slug, tasksDir);
        return;
      }

      setupTasksDirWatcher(slug, tasksDir);
    },

    stopWatching(slug: string): void {
      const watcher = watchers.get(slug);
      if (watcher) {
        watcher.close();
        watchers.delete(slug);
      }
      const parentWatcher = parentWatchers.get(slug);
      if (parentWatcher) {
        parentWatcher.close();
        parentWatchers.delete(slug);
      }
      taskCache.delete(slug);
      watchedSlugs.delete(slug);
      watcherLogger.info(`[ProgressWatcherV2] Stopped watching slug: ${slug}`);
    },

    getTasksForFeature(slug: string): TaskProgress[] {
      const cache = taskCache.get(slug);
      if (!cache) {
        return [];
      }
      return Array.from(cache.values()).sort((a, b) => a.taskNumber - b.taskNumber);
    },

    getTask(slug: string, taskNumber: number): TaskProgress | null {
      const cache = taskCache.get(slug);
      if (!cache) {
        return null;
      }
      return cache.get(taskNumber) ?? null;
    },

    onTaskUpdated(listener: TaskUpdatedListener): void {
      listeners.add(listener);
    },

    offTaskUpdated(listener: TaskUpdatedListener): void {
      listeners.delete(listener);
    },

    dispose(): void {
      for (const [slug, watcher] of watchers.entries()) {
        watcher.close();
        watcherLogger.info(`[ProgressWatcherV2] Disposed watcher for slug: ${slug}`);
      }
      for (const [slug, watcher] of parentWatchers.entries()) {
        watcher.close();
        watcherLogger.info(`[ProgressWatcherV2] Disposed parent watcher for slug: ${slug}`);
      }
      watchers.clear();
      parentWatchers.clear();
      taskCache.clear();
      watchedSlugs.clear();
    },
  };
}
