import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workflowRuns = sqliteTable('workflow_runs', {
  runId: text('run_id').primaryKey(),
  featureName: text('feature_name').notNull(),
  state: text('state').notNull(),
  config: text('config', { mode: 'json' }).$type<unknown>(),
  resolvedAgents: text('resolved_agents', { mode: 'json' }).$type<unknown>(),
  error: text('error'),
  startedAt: text('started_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
}, (table) => [
  index('idx_workflow_runs_state').on(table.state),
]);
