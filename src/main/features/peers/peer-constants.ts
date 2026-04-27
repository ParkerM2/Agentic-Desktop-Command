/**
 * Protocol-level + runtime constants shared across the peers module.
 * Keep this file dependency-free.
 */

// WebSocket close codes (audit 02/H2)
export const WS_CLOSE_CODES = {
  SCHEMA_MISMATCH: 4001,
  FINGERPRINT_MISMATCH: 4002,
  MALFORMED_FRAME: 4003,
  UNTRUSTED: 4004,
} as const;

export const WS_RECONNECT_BASE_MS = 500;
export const WS_RECONNECT_MAX_MS = 30_000;
export const WS_RECONNECT_JITTER = 0.25;
export const MAX_INBOUND_SOCKETS = 64;

// mDNS
export const MDNS_SERVICE_TYPE = 'adc-peer';
export const MDNS_PROTOCOL = 'tcp';

// Peer identity
export const PEER_ID_SHORT_LEN = 8;

// Network
export const LOOPBACK_HOST = '127.0.0.1';

// Pairing server
export const PAIR_BODY_MAX_BYTES = 16 * 1024;
export const PAIR_REQUEST_TIMEOUT_MS = 15_000;
export const PAIR_HEADERS_TIMEOUT_MS = 10_000;
export const PAIR_KEEPALIVE_TIMEOUT_MS = 5_000;
export const PAIR_BODY_READ_TIMEOUT_MS = 5_000;

// Pairing sessions
export const SESSION_TTL_MS = 5 * 60 * 1000;
export const SESSION_MAX_ATTEMPTS = 3;
export const SESSION_SOFT_LIMIT = 100;

// GC
export const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;
