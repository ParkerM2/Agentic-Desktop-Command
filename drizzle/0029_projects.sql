CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  root_path TEXT NOT NULL,
  git_url TEXT,
  repo_structure TEXT NOT NULL DEFAULT 'single',
  default_branch TEXT NOT NULL DEFAULT 'main',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
--> statement-breakpoint
CREATE TABLE sub_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  git_url TEXT,
  default_branch TEXT NOT NULL DEFAULT 'main',
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_sub_projects_project ON sub_projects(project_id);
