/**
 * Command History Store
 *
 * Persists the last 1000 assistant command entries to a JSON file
 * in the app's user data directory. Entries include input, intent,
 * response summary, and timestamp — never raw API keys or tokens.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { CommandHistoryEntry } from '@shared/types';

import { serviceLogger } from '@main/lib/logger';
import type { ReinitializableService } from '@main/services/data-management';

const MAX_HISTORY_ENTRIES = 1000;
const HISTORY_FILE = 'assistant-history.json';

export interface HistoryStore extends ReinitializableService {
  /** Get the most recent entries, newest first. */
  getEntries: (limit?: number) => CommandHistoryEntry[];
  /** Add a new entry to the history. */
  addEntry: (entry: CommandHistoryEntry) => void;
  /** Clear all history entries. */
  clear: () => void;
}

function loadHistoryFromPath(filePath: string): CommandHistoryEntry[] {
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as CommandHistoryEntry[];
    }
    return [];
  } catch {
    serviceLogger.error('[HistoryStore] Failed to load history, starting fresh');
    return [];
  }
}

function saveHistoryToPath(filePath: string, entries: CommandHistoryEntry[]): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

export function createHistoryStore(): HistoryStore {
  let currentFilePath = join(app.getPath('userData'), HISTORY_FILE);
  let entries: CommandHistoryEntry[] = loadHistoryFromPath(currentFilePath);

  return {
    getEntries(limit) {
      const sorted = [...entries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      if (limit !== undefined && limit > 0) {
        return sorted.slice(0, limit);
      }
      return sorted;
    },

    addEntry(entry) {
      entries.push(entry);

      // Trim to max entries, keeping the newest
      if (entries.length > MAX_HISTORY_ENTRIES) {
        entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        entries = entries.slice(0, MAX_HISTORY_ENTRIES);
      }

      saveHistoryToPath(currentFilePath, entries);
    },

    clear() {
      entries = [];
      saveHistoryToPath(currentFilePath, entries);
    },

    reinitialize(dataDir: string) {
      currentFilePath = join(dataDir, HISTORY_FILE);
      entries = loadHistoryFromPath(currentFilePath);
    },

    clearState() {
      entries = [];
    },
  };
}
