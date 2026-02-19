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

const MAX_HISTORY_ENTRIES = 1000;

export interface HistoryStore {
  /** Get the most recent entries, newest first. */
  getEntries: (limit?: number) => CommandHistoryEntry[];
  /** Add a new entry to the history. */
  addEntry: (entry: CommandHistoryEntry) => void;
  /** Clear all history entries. */
  clear: () => void;
}

function getHistoryFilePath(): string {
  return join(app.getPath('userData'), 'assistant-history.json');
}

function loadHistory(): CommandHistoryEntry[] {
  const filePath = getHistoryFilePath();
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

function saveHistory(entries: CommandHistoryEntry[]): void {
  const filePath = getHistoryFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

export function createHistoryStore(): HistoryStore {
  let entries: CommandHistoryEntry[] = loadHistory();

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

      saveHistory(entries);
    },

    clear() {
      entries = [];
      saveHistory(entries);
    },
  };
}
