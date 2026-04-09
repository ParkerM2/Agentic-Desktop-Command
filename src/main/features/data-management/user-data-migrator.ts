// src/main/services/data-management/user-data-migrator.ts
/**
 * User Data Migrator
 *
 * Migrates existing global data files to user-scoped directories
 * on first login by a user.
 */

import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const USER_SCOPED_FILES = [
  'notes.json',
  'captures.json',
  'briefings.json',
  'assistant-history.json',
  'assistant-watches.json',
  'alerts.json',
  'ideas.json',
  'milestones.json',
  'changelog.json',
];

const USER_SCOPED_DIRS = ['planner', 'fitness'];

export interface UserDataMigrator {
  /** Migrate global data to user directory if user dir is empty. */
  migrateIfNeeded: (globalDir: string, userDir: string) => void;
}

export function createUserDataMigrator(): UserDataMigrator {
  function copyDirRecursive(src: string, dest: string): void {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    for (const entry of readdirSync(src)) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      if (statSync(srcPath).isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  return {
    migrateIfNeeded(globalDir, userDir) {
      // Check if user dir already has data
      const hasExistingData = USER_SCOPED_FILES.some((f) => existsSync(join(userDir, f)));
      if (hasExistingData) {
        return; // Already migrated or has data
      }

      // Migrate files
      for (const file of USER_SCOPED_FILES) {
        const src = join(globalDir, file);
        const dest = join(userDir, file);
        if (existsSync(src) && !existsSync(dest)) {
          copyFileSync(src, dest);
        }
      }

      // Migrate directories
      for (const dir of USER_SCOPED_DIRS) {
        const src = join(globalDir, dir);
        const dest = join(userDir, dir);
        if (existsSync(src) && !existsSync(dest)) {
          copyDirRecursive(src, dest);
        }
      }
    },
  };
}
