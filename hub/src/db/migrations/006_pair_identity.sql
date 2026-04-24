-- Pair Identity & Audit
-- Migration 006: Add client identity columns to api_keys, pairing_events audit log,
-- and client_bindings table for per-clientId Ed25519 public keys.

-- ═══════════════════════════════════════════════════════════════════
-- API_KEYS: pair identity + revocation columns
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE api_keys ADD COLUMN client_id TEXT;
ALTER TABLE api_keys ADD COLUMN display_name TEXT;
ALTER TABLE api_keys ADD COLUMN pubkey_fp TEXT;
ALTER TABLE api_keys ADD COLUMN revoked_at INTEGER;
ALTER TABLE api_keys ADD COLUMN revoked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys(client_id);

-- ═══════════════════════════════════════════════════════════════════
-- PAIRING_EVENTS: append-only audit log for pairing lifecycle
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pairing_events (
  id           TEXT PRIMARY KEY,
  ts           INTEGER NOT NULL,
  event_type   TEXT NOT NULL,
  client_id    TEXT,
  display_name TEXT,
  source_ip    TEXT,
  user_agent   TEXT,
  pubkey_fp    TEXT,
  outcome      TEXT NOT NULL,
  reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_pairing_events_ts ON pairing_events(ts);
CREATE INDEX IF NOT EXISTS idx_pairing_events_client_id ON pairing_events(client_id);
CREATE INDEX IF NOT EXISTS idx_pairing_events_event_type ON pairing_events(event_type);

-- ═══════════════════════════════════════════════════════════════════
-- CLIENT_BINDINGS: Ed25519 public key pinned per clientId
-- (referenced by Tasks 9/10; declared here as the canonical schema location)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS client_bindings (
  client_id  TEXT PRIMARY KEY,
  pubkey_der BLOB NOT NULL,
  created_at INTEGER NOT NULL
);
