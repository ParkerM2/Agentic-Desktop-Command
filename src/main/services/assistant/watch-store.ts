/**
 * Watch Store — Persistent JSON file storage for assistant watches
 *
 * Watches are stored at `userData/assistant-watches.json` and loaded on app start.
 * One-shot watches (default) are marked triggered after firing.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { AssistantWatch } from '@shared/types';

interface WatchStoreData {
  watches: AssistantWatch[];
}

function getFilePath(): string {
  return join(app.getPath('userData'), 'assistant-watches.json');
}

function loadFromDisk(): AssistantWatch[] {
  const filePath = getFilePath();
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as unknown as WatchStoreData;
      return Array.isArray(data.watches) ? data.watches : [];
    } catch {
      return [];
    }
  }
  return [];
}

function saveToDisk(watches: AssistantWatch[]): void {
  const filePath = getFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const data: WatchStoreData = { watches };
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export interface WatchStore {
  add: (watch: Omit<AssistantWatch, 'id' | 'createdAt' | 'triggered'>) => AssistantWatch;
  remove: (id: string) => void;
  getActive: () => AssistantWatch[];
  getAll: () => AssistantWatch[];
  markTriggered: (id: string) => void;
  clear: () => void;
}

export function createWatchStore(): WatchStore {
  let watches = loadFromDisk();

  return {
    add(partial) {
      const watch: AssistantWatch = {
        ...partial,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        triggered: false,
      };
      watches.push(watch);
      saveToDisk(watches);
      return watch;
    },

    remove(id) {
      watches = watches.filter((w) => w.id !== id);
      saveToDisk(watches);
    },

    getActive() {
      return watches.filter((w) => !w.triggered);
    },

    getAll() {
      return [...watches];
    },

    markTriggered(id) {
      const watch = watches.find((w) => w.id === id);
      if (watch) {
        watch.triggered = true;
        saveToDisk(watches);
      }
    },

    clear() {
      watches = [];
      saveToDisk(watches);
    },
  };
}
