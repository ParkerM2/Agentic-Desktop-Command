CREATE TABLE workflow_runs_summary (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  workflow_id TEXT,
  status TEXT NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  summary TEXT,
  ran_on_peer_id TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX workflow_runs_summary_by_project ON workflow_runs_summary(project_id);
--> statement-breakpoint
CREATE INDEX workflow_runs_summary_by_task ON workflow_runs_summary(task_id);
