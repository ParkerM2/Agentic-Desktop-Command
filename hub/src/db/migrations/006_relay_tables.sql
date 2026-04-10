-- Hub Relay Tables
-- Migration 006: Device-project associations, project claims, session relay, and session buffer

-- ═══════════════════════════════════════════════════════════════════
-- DEVICE PROJECTS
-- Tracks which devices have access to which projects
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS device_projects (
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  granted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_device_projects_device_id ON device_projects(device_id);

-- ═══════════════════════════════════════════════════════════════════
-- PROJECT CLAIMS
-- Records which device has claimed execution rights for a project.
-- Only one active claim per project (enforced by UNIQUE on project_id).
-- Claims expire after 60s and must be renewed via the renew endpoint.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_claims (
  project_id           TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  claimed_by_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  host_device_id       TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  expires_at           TEXT NOT NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_claims_claimed_by_device_id ON project_claims(claimed_by_device_id);
CREATE INDEX IF NOT EXISTS idx_project_claims_host_device_id ON project_claims(host_device_id);

-- ═══════════════════════════════════════════════════════════════════
-- SESSION RELAY
-- Represents an active relay session between a claiming device and
-- the host device executing work on a project
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_relay (
  id          TEXT PRIMARY KEY,
  claim_id    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK(status IN ('active', 'ended', 'disconnected')),
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_relay_claim_id ON session_relay(claim_id);
CREATE INDEX IF NOT EXISTS idx_session_relay_status ON session_relay(status);

-- ═══════════════════════════════════════════════════════════════════
-- SESSION BUFFER
-- Stores ordered message frames for a relay session.
-- Capped at 200 messages per session (enforced in application code).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_buffer (
  session_id  TEXT NOT NULL REFERENCES session_relay(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL,
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_session_buffer_session_id ON session_buffer(session_id);
