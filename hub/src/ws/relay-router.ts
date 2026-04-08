/**
 * Hub WebSocket Relay Router
 *
 * Handles session.* messages and routes them point-to-point between
 * device connections. Persists session.output frames to session_buffer
 * for reconnect replay.
 */

import { randomUUID } from 'node:crypto';

import type { WebSocket } from 'ws';
import type Database from 'better-sqlite3';

import { getClientByDeviceId } from './broadcaster.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_BUFFER_CAP = 200;
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PRUNE_SESSION_AGE_MS = 60 * 60 * 1000; // 1 hour

// ─── Types ────────────────────────────────────────────────────────────────────

export type RelayMessageType =
  | 'session.spawn'
  | 'session.input'
  | 'session.output'
  | 'session.kill'
  | 'session.ended'
  | 'session.resume';

export interface RelayMessage {
  type: RelayMessageType;
  sessionId: string;
  projectId?: string;
  data?: Record<string, unknown>;
  lastSeq?: number;
}

interface SessionRelayRow {
  id: string;
  claim_id: string;
  status: 'active' | 'ended' | 'disconnected';
  started_at: string;
  ended_at: string | null;
}

interface ProjectClaimRow {
  id: string;
  project_id: string;
  claimed_by_device_id: string;
  host_device_id: string;
  claimed_at: string;
  released_at: string | null;
}

interface SessionBufferRow {
  session_id: string;
  seq: number;
  payload: string;
  created_at: string;
}

// ─── Pruning Interval ─────────────────────────────────────────────────────────

let pruneIntervalHandle: ReturnType<typeof setInterval> | undefined;

/**
 * Start the session buffer pruning interval.
 * Deletes buffer rows for sessions that ended more than 1 hour ago.
 */
export function startBufferPruning(db: Database.Database): void {
  if (pruneIntervalHandle !== undefined) {
    return; // Already started
  }

  pruneIntervalHandle = setInterval(() => {
    try {
      const cutoff = new Date(Date.now() - PRUNE_SESSION_AGE_MS).toISOString();

      // Find ended sessions whose ended_at is older than 1 hour
      const endedSessions = db
        .prepare(
          `SELECT id FROM session_relay
           WHERE status = 'ended' AND ended_at IS NOT NULL AND ended_at < ?`,
        )
        .all(cutoff) as Array<{ id: string }>;

      for (const session of endedSessions) {
        db.prepare('DELETE FROM session_buffer WHERE session_id = ?').run(session.id);
      }

      if (endedSessions.length > 0) {
        console.log(`[Relay] Pruned buffer for ${endedSessions.length} ended sessions`);
      }
    } catch (error) {
      console.error('[Relay] Error during buffer pruning:', error);
    }
  }, PRUNE_INTERVAL_MS);
}

/** Stop the pruning interval (for graceful shutdown). */
export function stopBufferPruning(): void {
  if (pruneIntervalHandle !== undefined) {
    clearInterval(pruneIntervalHandle);
    pruneIntervalHandle = undefined;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendToSocket(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function sendError(socket: WebSocket, sessionId: string, reason: string): void {
  sendToSocket(socket, {
    type: 'session.error',
    sessionId,
    error: reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Append a frame to session_buffer. Enforces the 200-message cap by
 * deleting the oldest row when the cap is exceeded.
 */
function appendToBuffer(
  db: Database.Database,
  sessionId: string,
  payload: Record<string, unknown>,
): void {
  // Get the next sequence number
  const maxSeqRow = db
    .prepare('SELECT MAX(seq) AS max_seq FROM session_buffer WHERE session_id = ?')
    .get(sessionId) as { max_seq: number | null };

  const nextSeq = (maxSeqRow.max_seq ?? 0) + 1;

  db.prepare(
    `INSERT INTO session_buffer (session_id, seq, payload, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(sessionId, nextSeq, JSON.stringify(payload), new Date().toISOString());

  // Enforce cap: delete oldest rows if over limit
  const countRow = db
    .prepare('SELECT COUNT(*) AS cnt FROM session_buffer WHERE session_id = ?')
    .get(sessionId) as { cnt: number };

  if (countRow.cnt > SESSION_BUFFER_CAP) {
    const excess = countRow.cnt - SESSION_BUFFER_CAP;
    db.prepare(
      `DELETE FROM session_buffer WHERE session_id = ? AND seq IN (
         SELECT seq FROM session_buffer WHERE session_id = ? ORDER BY seq ASC LIMIT ?
       )`,
    ).run(sessionId, sessionId, excess);
  }
}

// ─── Claim Validation ─────────────────────────────────────────────────────────

/**
 * Validate that sourceDeviceId holds an active (unreleased) claim on projectId.
 * Returns the claim row if valid, otherwise null.
 */
function validateClaim(
  db: Database.Database,
  projectId: string,
  sourceDeviceId: string,
): ProjectClaimRow | null {
  const claim = db
    .prepare(
      `SELECT * FROM project_claims
       WHERE project_id = ? AND claimed_by_device_id = ? AND released_at IS NULL`,
    )
    .get(projectId, sourceDeviceId) as ProjectClaimRow | undefined;

  return claim ?? null;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Handle an incoming relay message from a connected device.
 *
 * @param db       - SQLite database connection
 * @param socket   - The WebSocket of the sending device
 * @param deviceId - The device ID of the sender (from auth handshake)
 * @param raw      - Raw JSON string of the message
 */
export function handleRelayMessage(
  db: Database.Database,
  socket: WebSocket,
  deviceId: string,
  raw: string,
): void {
  let msg: RelayMessage;
  try {
    msg = JSON.parse(raw) as RelayMessage;
  } catch {
    console.error(`[Relay] Invalid JSON from device ${deviceId}:`, raw.slice(0, 100));
    return;
  }

  const { type, sessionId } = msg;

  if (!sessionId) {
    sendError(socket, '', 'Missing sessionId');
    return;
  }

  switch (type) {
    case 'session.spawn': {
      handleSessionSpawn(db, socket, deviceId, msg);
      break;
    }
    case 'session.input': {
      handleSessionInput(db, socket, deviceId, msg);
      break;
    }
    case 'session.output': {
      handleSessionOutput(db, socket, deviceId, msg);
      break;
    }
    case 'session.kill': {
      handleSessionKill(db, socket, deviceId, msg);
      break;
    }
    case 'session.ended': {
      handleSessionEnded(db, socket, deviceId, msg);
      break;
    }
    case 'session.resume': {
      handleSessionResume(db, socket, deviceId, msg);
      break;
    }
    default: {
      // Not a relay message — ignore silently
      break;
    }
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * session.spawn — source device spawns a session on the target (host) device.
 * Validates claim, creates session_relay row, routes spawn to host device.
 */
function handleSessionSpawn(
  db: Database.Database,
  socket: WebSocket,
  sourceDeviceId: string,
  msg: RelayMessage,
): void {
  const { sessionId, projectId, data } = msg;

  if (!projectId) {
    sendError(socket, sessionId, 'session.spawn requires projectId');
    return;
  }

  const claim = validateClaim(db, projectId, sourceDeviceId);
  if (!claim) {
    sendError(socket, sessionId, 'No active claim on project for this device');
    return;
  }

  // Create a session_relay record
  const relayId = randomUUID();
  db.prepare(
    `INSERT INTO session_relay (id, claim_id, status, started_at)
     VALUES (?, ?, 'active', ?)`,
  ).run(relayId, claim.id, new Date().toISOString());

  console.log(`[Relay] session.spawn: relay=${relayId} session=${sessionId} project=${projectId}`);

  // Route to host device
  const targetSocket = getClientByDeviceId(claim.host_device_id);
  if (!targetSocket) {
    sendError(socket, sessionId, 'Host device is not connected');
    return;
  }

  sendToSocket(targetSocket, {
    type: 'session.spawn',
    sessionId,
    relayId,
    projectId,
    sourceDeviceId,
    data: data ?? {},
    timestamp: new Date().toISOString(),
  });
}

/**
 * session.input — source device sends input to host device.
 */
function handleSessionInput(
  db: Database.Database,
  socket: WebSocket,
  sourceDeviceId: string,
  msg: RelayMessage,
): void {
  const { sessionId, data } = msg;

  // Look up active session_relay to find the claim → host device
  const relay = db
    .prepare(
      `SELECT sr.*, pc.claimed_by_device_id, pc.host_device_id, pc.project_id
       FROM session_relay sr
       JOIN project_claims pc ON sr.claim_id = pc.id
       WHERE sr.id = ? AND sr.status = 'active'`,
    )
    .get(sessionId) as (SessionRelayRow & ProjectClaimRow) | undefined;

  if (!relay) {
    sendError(socket, sessionId, 'No active relay session found');
    return;
  }

  // Validate source is the claiming device
  if (relay.claimed_by_device_id !== sourceDeviceId) {
    sendError(socket, sessionId, 'Not authorized to send input to this session');
    return;
  }

  const targetSocket = getClientByDeviceId(relay.host_device_id);
  if (!targetSocket) {
    sendError(socket, sessionId, 'Host device is not connected');
    return;
  }

  sendToSocket(targetSocket, {
    type: 'session.input',
    sessionId,
    sourceDeviceId,
    data: data ?? {},
    timestamp: new Date().toISOString(),
  });
}

/**
 * session.output — host device sends output to source device AND persists to buffer.
 */
function handleSessionOutput(
  db: Database.Database,
  socket: WebSocket,
  hostDeviceId: string,
  msg: RelayMessage,
): void {
  const { sessionId, data } = msg;

  const relay = db
    .prepare(
      `SELECT sr.*, pc.claimed_by_device_id, pc.host_device_id, pc.project_id
       FROM session_relay sr
       JOIN project_claims pc ON sr.claim_id = pc.id
       WHERE sr.id = ? AND sr.status = 'active'`,
    )
    .get(sessionId) as (SessionRelayRow & ProjectClaimRow) | undefined;

  if (!relay) {
    sendError(socket, sessionId, 'No active relay session found');
    return;
  }

  // Validate sender is the host device
  if (relay.host_device_id !== hostDeviceId) {
    sendError(socket, sessionId, 'Not authorized to send output for this session');
    return;
  }

  const outPayload: Record<string, unknown> = {
    type: 'session.output',
    sessionId,
    hostDeviceId,
    data: data ?? {},
    timestamp: new Date().toISOString(),
  };

  // Persist to session_buffer (with 200-message cap)
  appendToBuffer(db, sessionId, outPayload);

  // Route to source device
  const targetSocket = getClientByDeviceId(relay.claimed_by_device_id);
  if (targetSocket) {
    sendToSocket(targetSocket, outPayload);
  }
}

/**
 * session.kill — source device requests termination of the session on the host device.
 */
function handleSessionKill(
  db: Database.Database,
  socket: WebSocket,
  sourceDeviceId: string,
  msg: RelayMessage,
): void {
  const { sessionId, data } = msg;

  const relay = db
    .prepare(
      `SELECT sr.*, pc.claimed_by_device_id, pc.host_device_id, pc.project_id
       FROM session_relay sr
       JOIN project_claims pc ON sr.claim_id = pc.id
       WHERE sr.id = ? AND sr.status = 'active'`,
    )
    .get(sessionId) as (SessionRelayRow & ProjectClaimRow) | undefined;

  if (!relay) {
    sendError(socket, sessionId, 'No active relay session found');
    return;
  }

  if (relay.claimed_by_device_id !== sourceDeviceId) {
    sendError(socket, sessionId, 'Not authorized to kill this session');
    return;
  }

  const targetSocket = getClientByDeviceId(relay.host_device_id);
  if (!targetSocket) {
    sendError(socket, sessionId, 'Host device is not connected');
    return;
  }

  sendToSocket(targetSocket, {
    type: 'session.kill',
    sessionId,
    sourceDeviceId,
    data: data ?? {},
    timestamp: new Date().toISOString(),
  });
}

/**
 * session.ended — host device signals the session has ended.
 * Updates session_relay status to `ended`, routes to source device.
 */
function handleSessionEnded(
  db: Database.Database,
  socket: WebSocket,
  hostDeviceId: string,
  msg: RelayMessage,
): void {
  const { sessionId, data } = msg;

  const relay = db
    .prepare(
      `SELECT sr.*, pc.claimed_by_device_id, pc.host_device_id, pc.project_id
       FROM session_relay sr
       JOIN project_claims pc ON sr.claim_id = pc.id
       WHERE sr.id = ?`,
    )
    .get(sessionId) as (SessionRelayRow & ProjectClaimRow) | undefined;

  if (!relay) {
    sendError(socket, sessionId, 'Relay session not found');
    return;
  }

  if (relay.host_device_id !== hostDeviceId) {
    sendError(socket, sessionId, 'Not authorized to end this session');
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE session_relay SET status = 'ended', ended_at = ? WHERE id = ?`,
  ).run(now, sessionId);

  console.log(`[Relay] session.ended: session=${sessionId}`);

  // Route to source device
  const targetSocket = getClientByDeviceId(relay.claimed_by_device_id);
  if (targetSocket) {
    sendToSocket(targetSocket, {
      type: 'session.ended',
      sessionId,
      hostDeviceId,
      data: data ?? {},
      timestamp: now,
    });
  }
}

/**
 * session.resume — client reconnects and requests replay of buffered messages
 * after a given sequence number.
 */
function handleSessionResume(
  db: Database.Database,
  socket: WebSocket,
  deviceId: string,
  msg: RelayMessage,
): void {
  const { sessionId, lastSeq } = msg;
  const afterSeq = lastSeq ?? 0;

  // Verify device is authorized for this session
  const relay = db
    .prepare(
      `SELECT sr.*, pc.claimed_by_device_id, pc.host_device_id
       FROM session_relay sr
       JOIN project_claims pc ON sr.claim_id = pc.id
       WHERE sr.id = ?`,
    )
    .get(sessionId) as (SessionRelayRow & ProjectClaimRow) | undefined;

  if (!relay) {
    sendError(socket, sessionId, 'Relay session not found');
    return;
  }

  if (relay.claimed_by_device_id !== deviceId && relay.host_device_id !== deviceId) {
    sendError(socket, sessionId, 'Not authorized to resume this session');
    return;
  }

  const buffered = db
    .prepare(
      `SELECT seq, payload FROM session_buffer
       WHERE session_id = ? AND seq > ?
       ORDER BY seq ASC`,
    )
    .all(sessionId, afterSeq) as Array<{ seq: number; payload: string }>;

  console.log(`[Relay] session.resume: session=${sessionId} after_seq=${afterSeq} replaying=${buffered.length}`);

  // Send each buffered message back to the requesting socket
  for (const row of buffered) {
    try {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      sendToSocket(socket, { ...payload, _seq: row.seq });
    } catch {
      console.error(`[Relay] Corrupt buffer row session=${sessionId} seq=${row.seq}`);
    }
  }

  // Send a resume_complete marker
  sendToSocket(socket, {
    type: 'session.resume_complete',
    sessionId,
    replayed: buffered.length,
    timestamp: new Date().toISOString(),
  });
}
