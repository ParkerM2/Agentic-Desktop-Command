import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workflowAgents = sqliteTable('workflow_agents', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  role: text('role').notNull(),
  sessionId: text('session_id'),
  taskSlug: text('task_slug'),
  wave: integer('wave'),
  status: text('status').notNull().default('pending'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  error: text('error'),
}, (table) => [
  index('idx_workflow_agents_run_id').on(table.runId),
]);
