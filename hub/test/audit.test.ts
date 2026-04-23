import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { runMigrations } from '../src/db/migration-runner.js';
import { createAuditRepo } from '../src/lib/audit-repo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations');

interface EventRow {
  event_type: string;
  outcome: string;
  ts: number;
}

describe('audit-repo', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db, migrationsDir);
  });

  it('records a pair.confirm event', () => {
    const repo = createAuditRepo(db);
    repo.record({
      event_type: 'pair.confirm',
      client_id: 'c1',
      display_name: 'Test',
      source_ip: '127.0.0.1',
      user_agent: 'ua',
      pubkey_fp: 'fp',
      outcome: 'success',
    });
    const rows = db.prepare('SELECT * FROM pairing_events').all() as EventRow[];
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.event_type, 'pair.confirm');
    assert.equal(rows[0]!.outcome, 'success');
    assert.equal(typeof rows[0]!.ts, 'number');
  });

  it('list filters by clientId and eventType', () => {
    const repo = createAuditRepo(db);
    repo.record({ event_type: 'pair.init', client_id: 'a', outcome: 'success' });
    repo.record({ event_type: 'pair.init', client_id: 'b', outcome: 'success' });
    repo.record({ event_type: 'pair.confirm', client_id: 'a', outcome: 'success' });

    assert.equal(repo.list({ clientId: 'a' }).length, 2);
    assert.equal(repo.list({ eventType: 'pair.init' }).length, 2);
  });

  it('purgeOlderThan deletes old rows', () => {
    const repo = createAuditRepo(db);
    const old = Date.now() - 91 * 86_400_000;
    db.prepare(
      'INSERT INTO pairing_events (id, ts, event_type, outcome) VALUES (?, ?, ?, ?)',
    ).run('x', old, 'pair.init', 'success');

    const deleted = repo.purgeOlderThan(90 * 86_400_000);
    assert.equal(deleted, 1);
    assert.equal(repo.list({}).length, 0);
  });
});
