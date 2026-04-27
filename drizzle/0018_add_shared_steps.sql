-- drizzle/0018_add_shared_steps.sql
CREATE TABLE IF NOT EXISTS test_suite_shared_steps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_test_suite_shared_steps_project ON test_suite_shared_steps(project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_test_suite_shared_steps_domain ON test_suite_shared_steps(project_id, domain);
