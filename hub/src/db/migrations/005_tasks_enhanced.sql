-- Enhanced Task Fields for AG-Grid Display
-- Migration 005: Add agent_name, activity_history, cost tracking, PR info, completed_at, and task_sessions

-- ═══════════════════════════════════════════════════════════════════
-- UPDATE TASKS TABLE
-- Add AG-Grid cell renderer fields
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tasks ADD COLUMN agent_name TEXT;
ALTER TABLE tasks ADD COLUMN activity_history TEXT DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN cost_tokens INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN cost_usd REAL DEFAULT 0.0;
ALTER TABLE tasks ADD COLUMN pr_number INTEGER;
ALTER TABLE tasks ADD COLUMN pr_state TEXT;
ALTER TABLE tasks ADD COLUMN pr_ci_status TEXT;
ALTER TABLE tasks ADD COLUMN pr_url TEXT;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- TASK SESSIONS
-- Track spawned execution processes per task per device
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id),
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  token_usage INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_device_id ON task_sessions(device_id);
