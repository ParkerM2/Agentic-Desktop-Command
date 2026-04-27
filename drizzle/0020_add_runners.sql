-- drizzle/0020_add_runners.sql
CREATE TABLE IF NOT EXISTS runner_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  cwd_relative TEXT NOT NULL DEFAULT '.',
  env_json TEXT NOT NULL DEFAULT '{}',
  health_check_url TEXT,
  health_check_timeout_ms INTEGER NOT NULL DEFAULT 30000,
  auto_restart INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_runner_profiles_project ON runner_profiles(project_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS runner_instances (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  scope_project_id TEXT NOT NULL,
  scope_worktree_path TEXT,
  status TEXT NOT NULL,
  pid INTEGER,
  resolved_cwd TEXT NOT NULL,
  resolved_command TEXT NOT NULL,
  exit_code INTEGER,
  started_at TEXT,
  ready_at TEXT,
  stopped_at TEXT,
  last_error TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_runner_instances_profile ON runner_instances(profile_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_runner_instances_scope ON runner_instances(scope_project_id, scope_kind);
