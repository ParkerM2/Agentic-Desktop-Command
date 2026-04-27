import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const progressTasks = sqliteTable('progress_tasks', {
  slug: text('slug').primaryKey(),
  id: text('id'),
  projectId: text('project_id'),
  title: text('title').notNull(),
  status: text('status').notNull(),
  priority: text('priority').notNull().default('medium'),
  jiraKey: text('jira_key'),
  jiraUrl: text('jira_url'),
  prUrl: text('pr_url'),
  prNumber: integer('pr_number'),
  prStatus: text('pr_status'),
  lastSessionId: text('last_session_id'),
  lastAgentName: text('last_agent_name'),
  completedAt: text('completed_at'),
  archivedAt: text('archived_at'),
  teamName: text('team_name'),
  workflow: text('workflow'),
  workflowPhase: text('workflow_phase'),
  sessionHistory: text('session_history', { mode: 'json' }).$type<unknown[]>(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_progress_tasks_status').on(table.status),
  index('idx_progress_tasks_project').on(table.projectId),
]);
