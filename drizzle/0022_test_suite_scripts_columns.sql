-- Migration: Add missing columns to test_suite_scripts
-- The 0016 migration renamed qa_scripts → test_suite_scripts but never added
-- the columns expected by the current Drizzle schema.

ALTER TABLE test_suite_scripts ADD COLUMN target_url TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE test_suite_scripts ADD COLUMN step_count INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE test_suite_scripts ADD COLUMN last_status TEXT;
--> statement-breakpoint
ALTER TABLE test_suite_scripts ADD COLUMN last_run_at TEXT;
