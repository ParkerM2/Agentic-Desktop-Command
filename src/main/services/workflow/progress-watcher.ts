/**
 * Progress Watcher
 *
 * Watches `docs/progress/*.md` files in a project directory using `node:fs.watch()`.
 * On file change, reads the file and parses YAML-like frontmatter for status data.
 * Emits progress events via a callback when files change.
 */

import { existsSync, readdirSync, readFileSync, watch } from 'node:fs';
import { join } from 'node:path';

import { watcherLogger } from '@main/lib/logger';

import type { FSWatcher } from 'node:fs';

// ─── Types ──────────────────────────────────────────────────

export interface ProgressData {
  taskId: string;
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  currentAgent: string | null;
  filesChanged: number;
  filePath: string;
}

export type ProgressCallback = (data: ProgressData) => void;

export interface ProgressWatcher {
  start: () => void;
  stop: () => void;
  onProgress: (callback: ProgressCallback) => void;
}

// ─── Frontmatter parser ─────────────────────────────────────

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = /^---\r?\n([\S\s]*?)\r?\n---/.exec(content);
  if (!match) {
    return result;
  }

  const yaml = match[1];
  for (const line of yaml.split(/\r?\n/)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function getField(fm: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (key in fm) {
      return fm[key];
    }
  }
  return undefined;
}

function extractProgressData(filePath: string): ProgressData | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);

    const taskId = getField(fm, 'task_id', 'taskId') ?? '';
    const phase = getField(fm, 'phase') ?? 'unknown';
    const phaseIndex = Number.parseInt(getField(fm, 'phase_index', 'phaseIndex') ?? '0', 10);
    const totalPhases = Number.parseInt(getField(fm, 'total_phases', 'totalPhases') ?? '1', 10);
    const currentAgent = getField(fm, 'current_agent', 'currentAgent') ?? null;
    const filesChanged = Number.parseInt(getField(fm, 'files_changed', 'filesChanged') ?? '0', 10);

    if (!taskId) {
      return null;
    }

    return {
      taskId,
      phase,
      phaseIndex: Number.isNaN(phaseIndex) ? 0 : phaseIndex,
      totalPhases: Number.isNaN(totalPhases) ? 1 : totalPhases,
      currentAgent: currentAgent ?? null,
      filesChanged: Number.isNaN(filesChanged) ? 0 : filesChanged,
      filePath,
    };
  } catch {
    return null;
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createProgressWatcher(projectPath: string): ProgressWatcher {
  const progressDir = join(projectPath, 'docs', 'progress');
  const listeners: ProgressCallback[] = [];
  let watcher: FSWatcher | null = null;

  function notifyListeners(data: ProgressData): void {
    for (const listener of listeners) {
      listener(data);
    }
  }

  function handleFileChange(filename: string | null): void {
    if (!filename?.endsWith('.md')) {
      return;
    }

    const filePath = join(progressDir, filename);
    if (!existsSync(filePath)) {
      return;
    }

    const data = extractProgressData(filePath);
    if (data) {
      notifyListeners(data);
    }
  }

  function scanExistingFiles(): void {
    if (!existsSync(progressDir)) {
      return;
    }

    try {
      const files = readdirSync(progressDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = join(progressDir, file);
          const data = extractProgressData(filePath);
          if (data) {
            notifyListeners(data);
          }
        }
      }
    } catch {
      watcherLogger.error('[ProgressWatcher] Failed to scan existing files');
    }
  }

  return {
    start() {
      if (watcher) {
        return;
      }

      if (!existsSync(progressDir)) {
        watcherLogger.info(`[ProgressWatcher] Progress dir does not exist: ${progressDir}`);
        return;
      }

      watcherLogger.info(`[ProgressWatcher] Watching ${progressDir}`);

      // Scan existing files on start
      scanExistingFiles();

      try {
        watcher = watch(progressDir, (_eventType, filename) => {
          handleFileChange(filename);
        });

        watcher.on('error', (err) => {
          watcherLogger.error('[ProgressWatcher] Watch error:', err.message);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        watcherLogger.error('[ProgressWatcher] Failed to start watching:', message);
      }
    },

    stop() {
      if (watcher) {
        watcher.close();
        watcher = null;
        watcherLogger.info('[ProgressWatcher] Stopped watching');
      }
    },

    onProgress(callback) {
      listeners.push(callback);
    },
  };
}
