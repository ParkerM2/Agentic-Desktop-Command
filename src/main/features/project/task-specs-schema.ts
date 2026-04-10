import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const taskArtifacts = sqliteTable('task_artifacts', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull().$type<'spec' | 'requirement' | 'plan'>(),
  // task_specs columns
  projectId: text('project_id'),
  slug: text('slug'),
  title: text('title'),
  content: text('content'),
  // task_requirements columns
  specId: text('spec_id'),
  description: text('description'),
  status: text('status'),
  // task_plans columns
  version: text('version'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
}, (table) => [
  index('idx_task_artifacts_kind').on(table.kind),
  index('idx_task_artifacts_project_id').on(table.projectId),
  index('idx_task_artifacts_spec_id').on(table.specId),
]);
