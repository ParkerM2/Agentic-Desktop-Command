import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const runnerProfiles = sqliteTable(
  'runner_profiles',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    name: text('name').notNull(),
    command: text('command').notNull(),
    cwdRelative: text('cwd_relative').notNull().default('.'),
    envJson: text('env_json').notNull().default('{}'),
    healthCheckUrl: text('health_check_url'),
    healthCheckTimeoutMs: integer('health_check_timeout_ms').notNull().default(30_000),
    autoRestart: integer('auto_restart', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_runner_profiles_project').on(t.projectId),
  ],
);

export const runnerInstances = sqliteTable(
  'runner_instances',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    scopeKind: text('scope_kind').notNull(),
    scopeProjectId: text('scope_project_id').notNull(),
    scopeWorktreePath: text('scope_worktree_path'),
    status: text('status').notNull(),
    pid: integer('pid'),
    resolvedCwd: text('resolved_cwd').notNull(),
    resolvedCommand: text('resolved_command').notNull(),
    exitCode: integer('exit_code'),
    startedAt: text('started_at'),
    readyAt: text('ready_at'),
    stoppedAt: text('stopped_at'),
    lastError: text('last_error'),
  },
  (t) => [
    index('idx_runner_instances_profile').on(t.profileId),
    index('idx_runner_instances_scope').on(t.scopeProjectId, t.scopeKind),
  ],
);
