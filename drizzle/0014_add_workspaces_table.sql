CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  host_device_id TEXT,
  settings TEXT NOT NULL DEFAULT '{"autoStart":false,"maxConcurrent":3,"defaultBranch":"main"}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
