import { join } from 'node:path';

import { app } from 'electron';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export interface InitDatabaseOptions {
  migrationsFolder?: string;
}

export function initDatabase(
  userDataPath: string,
  options?: InitDatabaseOptions,
): ReturnType<typeof drizzle<typeof schema>> {
  const dbPath = join(userDataPath, 'adc.db');
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
