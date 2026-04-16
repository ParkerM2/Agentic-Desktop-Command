import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const testSuiteSharedSteps = sqliteTable('test_suite_shared_steps', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  description: text('description'),
  steps: text('steps').notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
