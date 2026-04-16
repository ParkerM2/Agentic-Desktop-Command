-- drizzle/0017_add_baselines_diffs.sql
CREATE TABLE IF NOT EXISTS test_suite_baselines (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_suite_diffs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  baseline_id TEXT NOT NULL,
  screenshot_id TEXT NOT NULL,
  diff_file_path TEXT NOT NULL,
  mismatch_percentage INTEGER NOT NULL,
  mismatch_pixels INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
