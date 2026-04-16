-- drizzle/0016_test_suite.sql
ALTER TABLE qa_scripts RENAME TO test_suite_scripts;
ALTER TABLE qa_runs RENAME TO test_suite_runs;

CREATE TABLE test_suite_screenshots (
  id TEXT PRIMARY KEY NOT NULL,
  run_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_label TEXT NOT NULL,
  trigger TEXT NOT NULL,
  file_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES test_suite_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES test_suite_scripts(id) ON DELETE CASCADE
);

CREATE INDEX idx_test_suite_screenshots_run ON test_suite_screenshots(run_id);
CREATE INDEX idx_test_suite_screenshots_script ON test_suite_screenshots(script_id);
