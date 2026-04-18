import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const testSuiteScripts = sqliteTable('test_suite_scripts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  baseUrl: text('base_url').notNull().default(''),
  steps: text('steps').notNull().default('[]'),
  filePath: text('file_path').notNull(),
  targetUrl: text('target_url').notNull(),
  tags: text('tags').notNull().default('[]'),
  stepCount: integer('step_count').notNull().default(0),
  lastStatus: text('last_status'),
  lastRunAt: text('last_run_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const testSuiteRuns = sqliteTable('test_suite_runs', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull(),
  projectId: text('project_id').notNull(),
  status: text('status').notNull(),
  triggeredBy: text('triggered_by').notNull().default('manual'),
  report: text('report'),
  durationMs: integer('duration_ms').notNull().default(0),
  stepsPassed: integer('steps_passed').notNull().default(0),
  stepsFailed: integer('steps_failed').notNull().default(0),
  output: text('output'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  taskId: text('task_id'),
  sessionId: text('session_id'),
});

export const testSuiteScreenshots = sqliteTable('test_suite_screenshots', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  scriptId: text('script_id').notNull(),
  stepIndex: integer('step_index').notNull(),
  stepLabel: text('step_label').notNull(),
  trigger: text('trigger').notNull(),
  filePath: text('file_path').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  capturedAt: text('captured_at').notNull(),
});
