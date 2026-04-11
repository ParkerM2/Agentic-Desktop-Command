/**
 * Changelog Service — SQLite-backed version history
 *
 * Changelog entries stored in the `changelog_entries` SQLite table.
 * One-time migration from changelog.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { desc } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';
import type { ChangeCategory, ChangelogEntry } from '@shared/types';

import { changelogEntries } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import { generateChangelogEntry } from './changelog-generator';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('changelog-service');

export interface ChangelogService {
  listEntries: () => ChangelogEntry[];
  addEntry: (data: {
    version: string;
    date: string;
    categories: ChangeCategory[];
  }) => ChangelogEntry;
  generateFromGit: (repoPath: string, version: string, fromTag?: string) => Promise<ChangelogEntry>;
}

interface ChangelogJsonFile {
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

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(changelogEntries).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'changelog.json');
  if (existsSync(jsonPath)) {
    try {
      const raw = readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<ChangelogJsonFile>;
      const items = Array.isArray(parsed.entries) ? parsed.entries : [];

      for (const item of items) {
        db.insert(changelogEntries).values({
          id: generateId(),
          version: item.version,
          date: item.date,
          categories: item.categories,
          createdAt: new Date().toISOString(),
        }).run();
      }
      logger.info(`Migrated ${String(items.length)} changelog entries from JSON to SQLite`);
      return;
    } catch (err) {
      logger.error('Failed to migrate changelog from JSON:', err);
    }
  }

  // Neither JSON file nor table data — seed with defaults
  for (const entry of DEFAULT_ENTRIES) {
    db.insert(changelogEntries).values({
      id: generateId(),
      version: entry.version,
      date: entry.date,
      categories: entry.categories,
      createdAt: new Date().toISOString(),
    }).run();
  }
  logger.info(`Seeded ${String(DEFAULT_ENTRIES.length)} default changelog entries`);
}

export function createChangelogService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): ChangelogService {
  const { db, dataDir } = deps;

  migrateFromJson(db, dataDir);

  return {
    listEntries() {
      const rows = db.select().from(changelogEntries)
        .orderBy(desc(changelogEntries.createdAt))
        .all();

      return rows.map((row) => ({
        version: row.version,
        date: row.date,
        categories: row.categories as ChangeCategory[],
      }));
    },

    addEntry(data) {
      const entry: ChangelogEntry = {
        version: data.version,
        date: data.date,
        categories: data.categories,
      };

      db.insert(changelogEntries).values({
        id: generateId(),
        version: entry.version,
        date: entry.date,
        categories: entry.categories,
        createdAt: new Date().toISOString(),
      }).run();

      return entry;
    },

    async generateFromGit(repoPath, version, fromTag) {
      const entry = await generateChangelogEntry(repoPath, version, fromTag);

      db.insert(changelogEntries).values({
        id: generateId(),
        version: entry.version,
        date: entry.date,
        categories: entry.categories,
        createdAt: new Date().toISOString(),
      }).run();

      return entry;
    },
  };
}
