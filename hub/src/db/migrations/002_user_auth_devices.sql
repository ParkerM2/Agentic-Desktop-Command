-- User Authentication & Multi-Device Support
-- Migration 002: Users, Sessions, Devices, Workspaces, Sub-projects

-- ═══════════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  settings TEXT, -- JSON blob for user preferences
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════════════
-- SESSIONS (JWT refresh tokens)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ═══════════════════════════════════════════════════════════════════
-- DEVICES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  machine_id TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK(device_type IN ('desktop', 'mobile', 'web')),
  device_name TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '{}', -- JSON: { canExecute: boolean, repos: string[] }
  is_online INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT,
  app_version TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(machine_id) -- machine_id unique if not null
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_machine_id ON devices(machine_id);

-- ═══════════════════════════════════════════════════════════════════
-- WORKSPACES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  host_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  settings TEXT, -- JSON blob for workspace settings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_host_device_id ON workspaces(host_device_id);

-- ═══════════════════════════════════════════════════════════════════
-- UPDATE PROJECTS TABLE
-- Add workspace association, git info, repo structure
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE projects ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN git_url TEXT;
ALTER TABLE projects ADD COLUMN repo_structure TEXT NOT NULL DEFAULT 'single' CHECK(repo_structure IN ('single', 'monorepo', 'multi-repo'));
ALTER TABLE projects ADD COLUMN default_branch TEXT DEFAULT 'main';
ALTER TABLE projects ADD COLUMN description TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

-- ═══════════════════════════════════════════════════════════════════
-- SUB-PROJECTS (for multi-repo support)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sub_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  git_url TEXT,
  default_branch TEXT DEFAULT 'main',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_sub_projects_project_id ON sub_projects(project_id);

-- ═══════════════════════════════════════════════════════════════════
-- UPDATE TASKS TABLE
-- Add workspace and sub-project associations
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tasks ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN sub_project_id TEXT REFERENCES sub_projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN assigned_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN created_by_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN execution_session_id TEXT;
ALTER TABLE tasks ADD COLUMN progress TEXT; -- JSON blob for TaskProgress
ALTER TABLE tasks ADD COLUMN metadata TEXT; -- JSON blob for extra data

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_project_id ON tasks(sub_project_id);
