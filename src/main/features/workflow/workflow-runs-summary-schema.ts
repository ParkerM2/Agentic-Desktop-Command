import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workflowRunsSummary = sqliteTable(
  'workflow_runs_summary',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    taskId: text('task_id'),
    workflowId: text('workflow_id'),
    status: text('status', { enum: ['queued', 'running', 'passed', 'failed', 'cancelled'] }).notNull(),
    startedAt: integer('started_at'),
    finishedAt: integer('finished_at'),
    summary: text('summary'),
    ranOnPeerId: text('ran_on_peer_id').notNull(),
  },
  (t) => [
    index('workflow_runs_summary_by_project').on(t.projectId),
    index('workflow_runs_summary_by_task').on(t.taskId),
  ],
);

export type WorkflowRunSummaryRow = typeof workflowRunsSummary.$inferSelect;
