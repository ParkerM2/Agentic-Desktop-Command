import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { runMigrations } from '../src/db/migration-runner.js';
import { createAuditRepo } from '../src/lib/audit-repo.js';
import { scheduleAuditRetention } from '../src/lib/audit-retention.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations');

test('purges rows older than retentionDays at startup', () => {
  const db = new Database(':memory:');
  runMigrations(db, migrationsDir);
  const audit = createAuditRepo(db);

  // Seed an old row (2 days ago) and a recent row.
  const old = Date.now() - 2 * 86_400_000;
  db.prepare(
    'INSERT INTO pairing_events (id, ts, event_type, outcome) VALUES (?,?,?,?)',
  ).run('old', old, 'pair.init', 'success');
  db.prepare(
    'INSERT INTO pairing_events (id, ts, event_type, outcome) VALUES (?,?,?,?)',
  ).run('new', Date.now(), 'pair.init', 'success');

  const purges: number[] = [];
  const stop = scheduleAuditRetention(audit, {
    retentionDays: 1,
    tickIntervalMs: 60_000,
    onPurge: (n) => purges.push(n),
  });

  // Initial run fires synchronously from scheduleAuditRetention.
  assert.equal(purges.length, 1);
  assert.equal(purges[0], 1);
  assert.equal(audit.list({}).length, 1);

  stop();
  db.close();
});

test('tick interval triggers repeat purge', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const db = new Database(':memory:');
    runMigrations(db, migrationsDir);
    const audit = createAuditRepo(db);

    const purges: number[] = [];
    const stop = scheduleAuditRetention(audit, {
      retentionDays: 1, // purge anything older than ~1 day
      tickIntervalMs: 1_000,
      onPurge: (n) => purges.push(n),
    });

    // Initial synchronous call.
    assert.equal(purges.length, 1);

    // Insert a row dated 2 days ago so the next tick purges it.
    const twoDaysAgo = Date.now() - 2 * 86_400_000;
    db.prepare(
      'INSERT INTO pairing_events (id, ts, event_type, outcome) VALUES (?,?,?,?)',
    ).run('stale', twoDaysAgo, 'pair.init', 'success');
    mock.timers.tick(1_001);
    assert.equal(purges.length, 2);
    assert.equal(purges[1], 1);

    stop();
    db.close();
  } finally {
    mock.timers.reset();
  }
});

test('stop() clears interval — no further purges', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const db = new Database(':memory:');
    runMigrations(db, migrationsDir);
    const audit = createAuditRepo(db);

    const purges: number[] = [];
    const stop = scheduleAuditRetention(audit, {
      retentionDays: 0,
      tickIntervalMs: 1_000,
      onPurge: (n) => purges.push(n),
    });
    assert.equal(purges.length, 1);
    stop();
    mock.timers.tick(10_000);
    assert.equal(purges.length, 1);
    db.close();
  } finally {
    mock.timers.reset();
  }
});
