import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type Database from 'better-sqlite3';

interface SchemaVersionRow {
  version: number | null;
}

export function runMigrations(db: Database.Database, migrationsDir: string): void {
  // Bootstrap: create schema_version table outside of migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get current schema version
  const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as
    | SchemaVersionRow
    | undefined;
  const current = row?.version ?? 0;

  // Read migration files sorted by numeric prefix
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Apply pending migrations in order
  for (const file of files) {
    const prefix = file.split('_')[0];
    if (prefix === undefined) continue;

    const version = Number.parseInt(prefix, 10);
    if (Number.isNaN(version) || version <= current) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const name = file.replace('.sql', '');

    // Each migration runs in a transaction for atomicity
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_version (version, name) VALUES (?, ?)').run(version, name);
    });

    applyMigration();
    console.log(`[Migration] Applied: ${name}`);
  }
}
