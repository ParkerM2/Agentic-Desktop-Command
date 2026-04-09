import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const progressTasks = sqliteTable('progress_tasks', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull(),
  priority: text('priority').notNull().default('medium'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  jiraKey: text('jira_key'),
  prUrl: text('pr_url'),
  branch: text('branch'),
  lastSessionId: text('last_session_id'),
  lastAgentName: text('last_agent_name'),
  completedAt: text('completed_at'),
  archivedAt: text('archived_at'),
  teamName: text('team_name'),
  sessionHistory: text('session_history', { mode: 'json' }).$type<unknown[]>(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_progress_tasks_status').on(table.status),
]);
