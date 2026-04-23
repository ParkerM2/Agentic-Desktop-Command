import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { app } from 'electron';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { resolveActiveDbPath } from '../features/hub/db-migrator';

import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export interface InitDatabaseOptions {
  migrationsFolder?: string;
  /**
   * When provided, the DB opens at `userData/hubs/<activeHubId>/adc.db`
   * (or `hubs/local/adc.db` when explicitly `null`). When undefined, the
   * legacy top-level `userData/adc.db` path is used — retained so
   * existing tests that don't care about per-hub layout keep working.
   *
   * TODO: Task 23 switch active hub — when the hub-switch IPC lands, the
   * DB singleton will need to close and reopen at the new resolved path.
   */
  activeHubId?: string | null;
}

export function initDatabase(
  userDataPath: string,
  options?: InitDatabaseOptions,
): ReturnType<typeof drizzle<typeof schema>> {
  const dbPath = options && 'activeHubId' in options
    ? resolveActiveDbPath(userDataPath, options.activeHubId ?? null)
    : join(userDataPath, 'adc.db');

  // Ensure the parent directory exists (per-hub path contains nested dirs).
  mkdirSync(dirname(dbPath), { recursive: true });

  sqlite = new Database(dbPath);

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = OFF');
  sqlite.pragma('busy_timeout = 5000');

  db = drizzle(sqlite, { schema });

  // Run migrations on startup
  const migrationsPath = options?.migrationsFolder
    ?? (app.isPackaged
      ? join(process.resourcesPath, 'drizzle')
      : join(__dirname, '../../drizzle'));
  migrate(db, { migrationsFolder: migrationsPath });

  return db;
}

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() first');
  }
  return db;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

export type AdcDatabase = ReturnType<typeof drizzle<typeof schema>>;
