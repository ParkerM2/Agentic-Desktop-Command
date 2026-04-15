import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const qaScripts = sqliteTable('qa_scripts', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  steps: text('steps', { mode: 'json' }).$type<unknown[]>().notNull(),
  filePath: text('file_path'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_qa_scripts_project_id').on(table.projectId),
]);

export const qaRuns = sqliteTable('qa_runs', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull(),
  projectId: text('project_id').notNull(),
  taskId: text('task_id'),
  sessionId: text('session_id'),
  status: text('status').notNull(),
  triggeredBy: text('triggered_by').notNull(),
  report: text('report', { mode: 'json' }).$type<unknown>(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
}, (table) => [
  index('idx_qa_runs_script_id').on(table.scriptId),
  index('idx_qa_runs_project_id').on(table.projectId),
  index('idx_qa_runs_status').on(table.status),
]);
