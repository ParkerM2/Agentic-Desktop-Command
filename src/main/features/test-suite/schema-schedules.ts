import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const testSuiteSchedules = sqliteTable('test_suite_schedules', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull(),
  projectId: text('project_id').notNull(),
  intervalMs: integer('interval_ms').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
