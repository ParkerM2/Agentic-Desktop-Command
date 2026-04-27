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

export const testSuiteBaselines = sqliteTable('test_suite_baselines', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull(),
  stepIndex: integer('step_index').notNull(),
  stepLabel: text('step_label').notNull(),
  filePath: text('file_path').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const testSuiteDiffs = sqliteTable('test_suite_diffs', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  baselineId: text('baseline_id').notNull(),
  screenshotId: text('screenshot_id').notNull(),
  diffFilePath: text('diff_file_path').notNull(),
  mismatchPercentage: integer('mismatch_percentage').notNull(),
  mismatchPixels: integer('mismatch_pixels').notNull(),
  threshold: integer('threshold').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});

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
