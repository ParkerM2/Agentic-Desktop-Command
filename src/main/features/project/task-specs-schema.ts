import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const taskSpecs = sqliteTable('task_specs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_task_specs_project_id').on(table.projectId),
]);

export const taskRequirements = sqliteTable('task_requirements', {
  id: text('id').primaryKey(),
  specId: text('spec_id').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_task_requirements_spec_id').on(table.specId),
]);

export const taskPlans = sqliteTable('task_plans', {
  id: text('id').primaryKey(),
  specId: text('spec_id').notNull(),
  content: text('content').notNull(),
  version: text('version').notNull().default('1'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_task_plans_spec_id').on(table.specId),
]);
