import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Bus Infrastructure Tables ───────────────────────────────

export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  domain: text('domain').notNull(),
  verb: text('verb').notNull(),
  noun: text('noun'),
  isMutation: integer('is_mutation', { mode: 'boolean' }).notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id'),
  sourceName: text('source_name'),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  status: text('status').notNull(),
  error: text('error'),
  durationMs: integer('duration_ms'),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_commands_domain').on(table.domain),
  index('idx_commands_verb').on(table.verb),
  index('idx_commands_source_type').on(table.sourceType),
  index('idx_commands_project_id').on(table.projectId),
  index('idx_commands_created_at').on(table.createdAt),
]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  phase: text('phase'),
  status: text('status').notNull(),
  projectId: text('project_id'),
  taskSlug: text('task_slug'),
  model: text('model'),
  pid: integer('pid'),
  worktreePath: text('worktree_path'),
  spawnConfig: text('spawn_config', { mode: 'json' }),
  tokenUsage: text('token_usage', { mode: 'json' }),
  toolUsage: text('tool_usage', { mode: 'json' }),
  parentId: text('parent_id'),
  teamName: text('team_name'),
  wave: integer('wave'),
  taskIndex: integer('task_index'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  exitCode: integer('exit_code'),
  error: text('error'),
}, (table) => [
  index('idx_sessions_status').on(table.status),
  index('idx_sessions_type').on(table.type),
  index('idx_sessions_project_id').on(table.projectId),
  index('idx_sessions_task_slug').on(table.taskSlug),
  index('idx_sessions_parent_id').on(table.parentId),
]);

export const busEvents = sqliteTable('bus_events', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  payload: text('payload', { mode: 'json' }),
  sourceCommandId: text('source_command_id'),
  sessionId: text('session_id'),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_events_channel').on(table.channel),
  index('idx_events_session_id').on(table.sessionId),
  index('idx_events_source_command_id').on(table.sourceCommandId),
  index('idx_events_created_at').on(table.createdAt),
]);
