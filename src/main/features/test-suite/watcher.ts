/**
 * Test Suite File Watcher
 *
 * Watches spec files on disk via `fs.watch`. When a watched file changes,
 * invokes a debounced callback (500ms) so the caller can re-run the script.
 * Watchers are tracked by scriptId so the renderer can toggle them on/off.
 */

import fs from 'node:fs';

export interface WatchEntry {
  scriptId: string;
  filePath: string;
  watcher: fs.FSWatcher;
}

export interface FileWatcher {
  watch: (scriptId: string, filePath: string, onChanged: () => void) => void;
  unwatch: (scriptId: string) => void;
  unwatchAll: () => void;
  isWatching: (scriptId: string) => boolean;
  listWatched: () => string[];
}

export function createFileWatcher(): FileWatcher {
  const watched = new Map<string, WatchEntry>();

  return {
    watch(scriptId, filePath, onChanged) {
      if (watched.has(scriptId)) return;
      if (!fs.existsSync(filePath)) return;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType !== 'change') return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onChanged();
        }, 500);
      });

      watched.set(scriptId, { scriptId, filePath, watcher });
    },

    unwatch(scriptId) {
      const entry = watched.get(scriptId);
      if (!entry) return;
      entry.watcher.close();
      watched.delete(scriptId);
    },

    unwatchAll() {
      for (const entry of watched.values()) {
        entry.watcher.close();
      }
      watched.clear();
    },

    isWatching(scriptId) {
      return watched.has(scriptId);
    },

    listWatched() {
      return [...watched.keys()];
    },
  };
}
