import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRunnersService } from '@main/features/runners/runners-service';

function makeDb() {
  const db = drizzle(new Database(':memory:'));
  db.run(`CREATE TABLE runner_profiles (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL,
    command TEXT NOT NULL, cwd_relative TEXT NOT NULL DEFAULT '.',
    env_json TEXT NOT NULL DEFAULT '{}', health_check_url TEXT,
    health_check_timeout_ms INTEGER NOT NULL DEFAULT 30000,
    auto_restart INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE runner_instances (
    id TEXT PRIMARY KEY, profile_id TEXT NOT NULL,
    scope_kind TEXT NOT NULL, scope_project_id TEXT NOT NULL,
    scope_worktree_path TEXT, status TEXT NOT NULL, pid INTEGER,
    resolved_cwd TEXT NOT NULL, resolved_command TEXT NOT NULL,
    exit_code INTEGER, started_at TEXT, ready_at TEXT,
    stopped_at TEXT, last_error TEXT
  )`);
  return db;
}

const fakeRouter = { emit: vi.fn() };
const fakeProjectService = { getProjectPath: vi.fn().mockReturnValue(process.cwd()) };

describe('runnersService profile CRUD', () => {
  beforeEach(() => {
    fakeRouter.emit.mockClear();
  });

  it('saves and lists profiles', () => {
    const db = makeDb();
    const svc = createRunnersService({
      db: db as unknown as never,
      router: fakeRouter as unknown as never,
      projectService: fakeProjectService as unknown as never,
    });

    const now = new Date().toISOString();
    const saved = svc.saveProfile({
      id: 'p1',
      projectId: 'proj-1',
      name: 'Dev',
      command: 'echo hi',
      cwdRelative: '.',
      env: {},
      healthCheckTimeoutMs: 30_000,
      autoRestart: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(saved.id).toBe('p1');

    const list = svc.listProfiles('proj-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Dev');
  });
});
