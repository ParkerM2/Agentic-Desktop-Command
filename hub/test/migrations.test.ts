import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { runMigrations } from '../src/db/migration-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations');

interface ColumnRow {
  name: string;
}

describe('migration 006_pair_identity', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db, migrationsDir);
  });

  it('api_keys has new pair-identity columns', () => {
    const cols = db.prepare('PRAGMA table_info(api_keys)').all() as ColumnRow[];
    const names = cols.map((c) => c.name);
    for (const expected of [
      'client_id',
      'display_name',
      'pubkey_fp',
      'revoked_at',
      'revoked_reason',
    ]) {
      assert.ok(names.includes(expected), `api_keys missing column: ${expected}`);
    }
  });

  it('pairing_events table exists with required columns', () => {
    const cols = db.prepare('PRAGMA table_info(pairing_events)').all() as ColumnRow[];
    const names = cols.map((c) => c.name);
    for (const expected of [
      'id',
      'ts',
      'event_type',
      'client_id',
      'display_name',
      'source_ip',
      'user_agent',
      'pubkey_fp',
      'outcome',
      'reason',
    ]) {
      assert.ok(names.includes(expected), `pairing_events missing column: ${expected}`);
    }
  });

  it('client_bindings table exists', () => {
    const cols = db.prepare('PRAGMA table_info(client_bindings)').all() as ColumnRow[];
    const names = cols.map((c) => c.name);
    for (const expected of ['client_id', 'pubkey_der', 'created_at']) {
      assert.ok(names.includes(expected), `client_bindings missing column: ${expected}`);
    }
  });
});
