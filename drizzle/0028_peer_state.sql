CREATE TABLE peer_state (
  peer_id TEXT PRIMARY KEY,
  display_name TEXT,
  pubkey TEXT NOT NULL,
  cert_fingerprint TEXT NOT NULL,
  last_seen_hlc TEXT,
  paired_at INTEGER NOT NULL,
  last_connected_at INTEGER,
  revoked_at INTEGER
);
