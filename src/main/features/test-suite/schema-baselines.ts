import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
