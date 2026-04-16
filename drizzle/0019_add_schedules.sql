-- drizzle/0019_add_schedules.sql
CREATE TABLE IF NOT EXISTS test_suite_schedules (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  interval_ms INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_test_suite_schedules_project ON test_suite_schedules(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_test_suite_schedules_script ON test_suite_schedules(script_id);
