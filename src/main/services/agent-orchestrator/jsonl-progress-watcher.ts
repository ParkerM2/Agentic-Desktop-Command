/**
 * JSONL Progress Watcher
 *
 * Watches per-task JSONL progress files written by Claude hooks.
 * Parses incremental lines (tail approach — tracks last read position),
 * debounces rapid file changes, and emits typed progress events via callback.
 */

import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { basename, join } from 'node:path';

import { agentLogger } from '@main/lib/logger';

import type { ProgressEntry } from './types';
import type { FSWatcher } from 'node:fs';

// ─── Types ──────────────────────────────────────────────────

export interface JsonlProgressEvent {
  taskId: string;
  entries: ProgressEntry[];
}

export type JsonlProgressCallback = (event: JsonlProgressEvent) => void;

export interface JsonlProgressWatcher {
  start: () => void;
  stop: () => void;
  onProgress: (callback: JsonlProgressCallback) => void;
}

// ─── Constants ──────────────────────────────────────────────

const DEBOUNCE_MS = 100;

// ─── Factory ────────────────────────────────────────────────

export function createJsonlProgressWatcher(progressDir: string): JsonlProgressWatcher {
  const listeners: JsonlProgressCallback[] = [];
  const filePositions = new Map<string, number>();
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let watcher: FSWatcher | null = null;

  function notifyListeners(event: JsonlProgressEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function extractTaskId(filename: string): string {
    // Files are named {taskId}.jsonl
    return basename(filename, '.jsonl');
  }

  function parseNewLines(filePath: string, taskId: string): ProgressEntry[] {
    const entries: ProgressEntry[] = [];

    try {
      const stat = statSync(filePath);
      const lastPos = filePositions.get(filePath) ?? 0;

      // File hasn't grown — skip
      if (stat.size <= lastPos) {
        return entries;
      }

      // Read only the new bytes
      const content = readFileSync(filePath, 'utf-8');
      const newContent = content.slice(lastPos);

      // Update position to current file size
      filePositions.set(filePath, stat.size);

      // Parse each new line as JSON
      const lines = newContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
          continue;
        }

        try {
          const entry = JSON.parse(trimmed) as ProgressEntry;
          entries.push(entry);
        } catch {
          // Malformed line — skip
          agentLogger.warn(`[JsonlProgressWatcher] Malformed JSONL line for task ${taskId}`);
        }
      }
    } catch {
      // File may have been deleted between watch event and read
    }

    return entries;
  }

  function handleFileChange(filename: string | null): void {
    if (!filename?.endsWith('.jsonl')) {
      return;
    }

    // Debounce rapid changes for the same file
    const existing = debounceTimers.get(filename);
    if (existing) {
      clearTimeout(existing);
    }

    debounceTimers.set(
      filename,
      setTimeout(() => {
        debounceTimers.delete(filename);

        const filePath = join(progressDir, filename);
        if (!existsSync(filePath)) {
          // File deleted — clean up position tracking
          filePositions.delete(filePath);
          return;
        }

        const taskId = extractTaskId(filename);
        const entries = parseNewLines(filePath, taskId);

        if (entries.length > 0) {
          notifyListeners({ taskId, entries });
        }
      }, DEBOUNCE_MS),
    );
  }

  return {
    start() {
      if (watcher) {
        return;
      }

      if (!existsSync(progressDir)) {
        agentLogger.info(`[JsonlProgressWatcher] Progress dir does not exist yet: ${progressDir}`);
        return;
      }

      agentLogger.info(`[JsonlProgressWatcher] Watching ${progressDir}`);

      try {
        watcher = watch(progressDir, (_eventType, filename) => {
          handleFileChange(filename);
        });

        watcher.on('error', (err) => {
          agentLogger.error('[JsonlProgressWatcher] Watch error:', err.message);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        agentLogger.error('[JsonlProgressWatcher] Failed to start watching:', message);
      }
    },

    stop() {
      if (watcher) {
        watcher.close();
        watcher = null;
      }

      // Clear all debounce timers
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      filePositions.clear();

      agentLogger.info('[JsonlProgressWatcher] Stopped watching');
    },

    onProgress(callback) {
      listeners.push(callback);
    },
  };
}
