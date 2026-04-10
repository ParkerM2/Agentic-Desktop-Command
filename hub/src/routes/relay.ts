import type { FastifyInstance } from 'fastify';

import { broadcast, sendToDevice } from '../ws/broadcaster.js';

// ─── Types ────────────────────────────────────────────────────

interface ProjectClaimRow {
  project_id: string;
  claimed_by_device_id: string;
  host_device_id: string;
  expires_at: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────

/** Claim duration in milliseconds (60 seconds). */
const CLAIM_DURATION_MS = 60_000;

// ─── Routes ───────────────────────────────────────────────────

export async function relayRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // ─────────────────────────────────────────────────────────────
  // POST /api/projects/:id/claim — Exclusively claim a project
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { deviceId: string };
  }>('/api/projects/:id/claim', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id: projectId } = request.params;
    const { deviceId } = request.body;

    if (!deviceId) {
      return reply.status(400).send({
        success: false,
        error: 'deviceId is required',
      });
    }

    // Verify the device belongs to this user
    const device = db
      .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
      .get(deviceId, request.user.id) as { id: string } | undefined;

    if (!device) {
      return reply.status(404).send({
        success: false,
        error: 'Device not found',
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CLAIM_DURATION_MS).toISOString();
    const nowIso = now.toISOString();

    // Check for existing unexpired claim
    const existing = db
      .prepare(
        `SELECT * FROM project_claims
         WHERE project_id = ? AND expires_at > ?`,
      )
      .get(projectId, nowIso) as ProjectClaimRow | undefined;

    if (existing && existing.claimed_by_device_id !== deviceId) {
      return reply.status(409).send({
        success: false,
        error: 'Project is already claimed by another device',
        claimedByDeviceId: existing.claimed_by_device_id,
        expiresAt: existing.expires_at,
      });
    }

    // Upsert claim
    db.prepare(
      `INSERT INTO project_claims (project_id, claimed_by_device_id, host_device_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET
         claimed_by_device_id = excluded.claimed_by_device_id,
         host_device_id = excluded.host_device_id,
         expires_at = excluded.expires_at`,
    ).run(projectId, deviceId, deviceId, expiresAt, nowIso);

    const claim = db
      .prepare('SELECT * FROM project_claims WHERE project_id = ?')
      .get(projectId) as ProjectClaimRow;

    broadcast('project', 'updated', projectId, {
      event: 'project.claimed',
      projectId,
      claimedByDeviceId: deviceId,
      expiresAt: claim.expires_at,
    });

    return reply.status(201).send({
      success: true,
      data: {
        projectId,
        claimedByDeviceId: claim.claimed_by_device_id,
        hostDeviceId: claim.host_device_id,
        expiresAt: claim.expires_at,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/projects/:id/release — Release a project claim
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { deviceId: string };
  }>('/api/projects/:id/release', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id: projectId } = request.params;
    const { deviceId } = request.body;

    if (!deviceId) {
      return reply.status(400).send({
        success: false,
        error: 'deviceId is required',
      });
    }

    // Verify the device belongs to this user
    const device = db
      .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
      .get(deviceId, request.user.id) as { id: string } | undefined;

    if (!device) {
      return reply.status(404).send({
        success: false,
        error: 'Device not found',
      });
    }

    const now = new Date().toISOString();

    // Only the claiming device can release
    const claim = db
      .prepare(
        `SELECT * FROM project_claims
         WHERE project_id = ? AND claimed_by_device_id = ? AND expires_at > ?`,
      )
      .get(projectId, deviceId, now) as ProjectClaimRow | undefined;

    if (!claim) {
      return reply.status(404).send({
        success: false,
        error: 'No active claim found for this device on this project',
      });
    }

    db.prepare('DELETE FROM project_claims WHERE project_id = ?').run(projectId);

    broadcast('project', 'updated', projectId, {
      event: 'project.released',
      projectId,
      releasedByDeviceId: deviceId,
    });

    return reply.send({ success: true });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/projects/:id/force-reclaim — Host device force-reclaims
  // Broadcasts a WS notification to the current claimer (Gap D fix)
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { deviceId: string };
  }>('/api/projects/:id/force-reclaim', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id: projectId } = request.params;
    const { deviceId } = request.body;

    if (!deviceId) {
      return reply.status(400).send({
        success: false,
        error: 'deviceId is required',
      });
    }

    // Verify the device belongs to this user
    const device = db
      .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
      .get(deviceId, request.user.id) as { id: string } | undefined;

    if (!device) {
      return reply.status(404).send({
        success: false,
        error: 'Device not found',
      });
    }

    // Check existing claim — only the host device may force-reclaim
    const existing = db
      .prepare('SELECT * FROM project_claims WHERE project_id = ?')
      .get(projectId) as ProjectClaimRow | undefined;

    if (existing && existing.host_device_id !== deviceId) {
      return reply.status(403).send({
        success: false,
        error: 'Only the host device can force-reclaim this project',
        hostDeviceId: existing.host_device_id,
      });
    }

    // Capture the previous claimer before overwriting
    const previousClaimerId = existing?.claimed_by_device_id;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CLAIM_DURATION_MS).toISOString();
    const nowIso = now.toISOString();

    db.prepare(
      `INSERT INTO project_claims (project_id, claimed_by_device_id, host_device_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET
         claimed_by_device_id = excluded.claimed_by_device_id,
         expires_at = excluded.expires_at`,
    ).run(projectId, deviceId, deviceId, expiresAt, nowIso);

    const claim = db
      .prepare('SELECT * FROM project_claims WHERE project_id = ?')
      .get(projectId) as ProjectClaimRow;

    // Broadcast to all clients
    broadcast('project', 'updated', projectId, {
      event: 'project.claimed',
      projectId,
      claimedByDeviceId: deviceId,
      forceReclaim: true,
      expiresAt: claim.expires_at,
    });

    // Send targeted WS notification to the previous claimer (Gap D)
    if (previousClaimerId && previousClaimerId !== deviceId) {
      sendToDevice(previousClaimerId, {
        type: 'claim.reclaimed',
        projectId,
        reclaimedByDeviceId: deviceId,
        expiresAt: claim.expires_at,
        timestamp: nowIso,
      });
    }

    return reply.status(201).send({
      success: true,
      data: {
        projectId,
        claimedByDeviceId: claim.claimed_by_device_id,
        hostDeviceId: claim.host_device_id,
        expiresAt: claim.expires_at,
        forceReclaim: true,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/projects/:id/renew-claim — Extend claim expiry (Gap C fix)
  // Extends expires_at by 60 seconds from now.
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { deviceId: string };
  }>('/api/projects/:id/renew-claim', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id: projectId } = request.params;
    const { deviceId } = request.body;

    if (!deviceId) {
      return reply.status(400).send({
        success: false,
        error: 'deviceId is required',
      });
    }

    // Verify the device belongs to this user
    const device = db
      .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
      .get(deviceId, request.user.id) as { id: string } | undefined;

    if (!device) {
      return reply.status(404).send({
        success: false,
        error: 'Device not found',
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Only the claiming device can renew
    const claim = db
      .prepare(
        `SELECT * FROM project_claims
         WHERE project_id = ? AND claimed_by_device_id = ? AND expires_at > ?`,
      )
      .get(projectId, deviceId, nowIso) as ProjectClaimRow | undefined;

    if (!claim) {
      return reply.status(404).send({
        success: false,
        error: 'No active claim found for this device on this project',
      });
    }

    const newExpiresAt = new Date(now.getTime() + CLAIM_DURATION_MS).toISOString();

    db.prepare(
      'UPDATE project_claims SET expires_at = ? WHERE project_id = ?',
    ).run(newExpiresAt, projectId);

    return reply.send({
      success: true,
      data: {
        projectId,
        claimedByDeviceId: claim.claimed_by_device_id,
        expiresAt: newExpiresAt,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/sessions/:id/replay — Replay buffered session messages
  // ─────────────────────────────────────────────────────────────
  app.get<{
    Params: { id: string };
    Querystring: { after_seq?: string };
  }>('/api/sessions/:id/replay', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id: sessionId } = request.params;
    const afterSeq = request.query.after_seq !== undefined
      ? Number.parseInt(request.query.after_seq, 10)
      : 0;

    if (Number.isNaN(afterSeq)) {
      return reply.status(400).send({
        success: false,
        error: 'after_seq must be a valid integer',
      });
    }

    const messages = db
      .prepare(
        `SELECT seq, payload, created_at
         FROM session_buffer
         WHERE session_id = ? AND seq > ?
         ORDER BY seq ASC`,
      )
      .all(sessionId, afterSeq) as Array<{ seq: number; payload: string; created_at: string }>;

    return reply.send({
      success: true,
      data: {
        sessionId,
        messages: messages.map((row) => ({
          seq: row.seq,
          message: JSON.parse(row.payload) as unknown,
          timestamp: row.created_at,
        })),
      },
    });
  });
}
