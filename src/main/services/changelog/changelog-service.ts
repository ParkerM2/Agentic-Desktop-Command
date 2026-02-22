/**
 * Changelog Service — Disk-persisted version history
 *
 * Changelog entries stored as JSON in the app's user data directory.
 * All methods are synchronous except generateFromGit which uses async git operations.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ChangeCategory, ChangelogEntry } from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

import { generateChangelogEntry } from './changelog-generator';

export interface ChangelogService extends ReinitializableService {
  listEntries: () => ChangelogEntry[];
  addEntry: (data: {
    version: string;
    date: string;
    categories: ChangeCategory[];
  }) => ChangelogEntry;
  generateFromGit: (repoPath: string, version: string, fromTag?: string) => Promise<ChangelogEntry>;
}

interface ChangelogFile {
  entries: ChangelogEntry[];
}

const DEFAULT_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v0.3.0',
    date: 'February 2026',
    categories: [
      {
        type: 'added',
        items: [
          'Color theme picker with 7 themes',
          'UI scale slider (75-150%)',
          'Profile management system',
          'Changelog and Insights pages',
        ],
      },
      {
        type: 'changed',
        items: [
          'Settings page redesigned with sections',
          'Sidebar updated with new navigation items',
        ],
      },
      {
        type: 'fixed',
        items: ['Theme persistence across restarts', 'Sidebar collapse state preserved'],
      },
    ],
  },
  {
    version: 'v0.2.0',
    date: 'February 2026',
    categories: [
      {
        type: 'added',
        items: [
          'Terminal integration with xterm.js',
          'Agent management dashboard',
          'Task management dashboard',
          'GitHub integration page',
          'Roadmap and Ideation views',
        ],
      },
      {
        type: 'changed',
        items: ['Navigation restructured with project-scoped views'],
      },
    ],
  },
  {
    version: 'v0.1.0',
    date: 'February 2026',
    categories: [
      {
        type: 'added',
        items: [
          'Initial project scaffold',
          'IPC contract system',
          'Project management',
          'Task system with table-based dashboard',
          'Electron main process with services',
        ],
      },
    ],
  },
];

function loadFile(filePath: string): ChangelogFile {
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<ChangelogFile>;
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [...DEFAULT_ENTRIES],
      };
    } catch {
      return { entries: [...DEFAULT_ENTRIES] };
    }
  }
  return { entries: [...DEFAULT_ENTRIES] };
}

function saveFile(filePath: string, data: ChangelogFile): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createChangelogService(deps: { dataDir: string }): ChangelogService {
  // Mutable file path for user-scoping
  let currentFilePath = join(deps.dataDir, 'changelog.json');
  // In-memory cache
  let store = loadFile(currentFilePath);

  function persist(): void {
    saveFile(currentFilePath, store);
  }

  return {
    listEntries() {
      return [...store.entries];
    },

    addEntry(data) {
      const entry: ChangelogEntry = {
        version: data.version,
        date: data.date,
        categories: data.categories,
      };
      // Insert at the beginning (newest first)
      store.entries.unshift(entry);
      persist();
      return entry;
    },

    async generateFromGit(repoPath, version, fromTag) {
      return await generateChangelogEntry(repoPath, version, fromTag);
    },

    reinitialize(dataDir: string) {
      currentFilePath = join(dataDir, 'changelog.json');
      // Reload data from new path
      store = loadFile(currentFilePath);
    },

    clearState() {
      store = { entries: [...DEFAULT_ENTRIES] };
    },
  };
}
