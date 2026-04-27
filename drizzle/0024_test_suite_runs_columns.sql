-- Migration: Add missing columns to test_suite_runs
-- The original qa_runs table (0009) was renamed to test_suite_runs (0016)
-- but never got the columns the Drizzle schema expects.

ALTER TABLE test_suite_runs ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE test_suite_runs ADD COLUMN steps_passed INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE test_suite_runs ADD COLUMN steps_failed INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE test_suite_runs ADD COLUMN output TEXT;
