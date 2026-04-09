import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Domain Data Tables ──────────────────────────────────────

export const captures = sqliteTable('captures', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  projectId: text('project_id'),
  taskId: text('task_id'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_notes_project_id').on(table.projectId),
  index('idx_notes_updated_at').on(table.updatedAt),
]);

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'reminder' | 'deadline' | 'notification' | 'recurring'
  message: text('message').notNull(),
  triggerAt: text('trigger_at').notNull(),
  recurring: text('recurring', { mode: 'json' }).$type<{ frequency: string; time: string; daysOfWeek?: number[] } | null>(),
  linkedTo: text('linked_to', { mode: 'json' }).$type<{ type: string; id: string } | null>(),
  dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const ideas = sqliteTable('ideas', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull(), // 'new' | 'exploring' | 'accepted' | 'rejected' | 'implemented'
  category: text('category').notNull(), // 'feature' | 'improvement' | 'bug' | 'performance'
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  projectId: text('project_id'),
  votes: integer('votes').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_ideas_project_id').on(table.projectId),
  index('idx_ideas_status').on(table.status),
]);

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  targetDate: text('target_date').notNull(),
  status: text('status').notNull(), // 'planned' | 'in-progress' | 'completed'
  tasks: text('tasks', { mode: 'json' }).$type<Array<{ id: string; title: string; completed: boolean }>>().notNull(),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_milestones_project_id').on(table.projectId),
]);

export const changelogEntries = sqliteTable('changelog_entries', {
  version: text('version').primaryKey(),
  date: text('date').notNull(),
  categories: text('categories', { mode: 'json' }).$type<Array<{ type: string; items: string[] }>>().notNull(),
  createdAt: text('created_at').notNull(),
});

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
