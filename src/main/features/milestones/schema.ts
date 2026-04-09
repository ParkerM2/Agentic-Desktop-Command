import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
