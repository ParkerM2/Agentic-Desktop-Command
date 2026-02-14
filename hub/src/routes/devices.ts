import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import { broadcast } from '../ws/broadcaster.js';

// ─── Types ────────────────────────────────────────────────────

interface DeviceRow {
  id: string;
  machine_id: string | null;
  user_id: string;
  device_type: string;
  device_name: string;
  capabilities: string;
  is_online: number;
  last_seen: string | null;
  app_version: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDevice(row: DeviceRow) {
  return {
    id: row.id,
    machineId: row.machine_id ?? undefined,
    userId: row.user_id,
    deviceType: row.device_type as 'desktop' | 'mobile' | 'web',
    deviceName: row.device_name,
    capabilities: JSON.parse(row.capabilities),
    isOnline: row.is_online === 1,
    lastSeen: row.last_seen ?? undefined,
    appVersion: row.app_version ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Routes ───────────────────────────────────────────────────

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // ─────────────────────────────────────────────────────────────
  // POST /api/devices — Register a new device
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      machineId?: string;
      deviceName: string;
      deviceType: 'desktop' | 'mobile' | 'web';
      capabilities: { canExecute: boolean; repos: string[] };
      appVersion?: string;
    };
  }>('/api/devices', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { machineId, deviceName, deviceType, capabilities, appVersion } = request.body;

    // Validate required fields
    if (!deviceName || !deviceType) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'deviceName and deviceType are required' },
      });
    }

    // Validate device type
    if (!['desktop', 'mobile', 'web'].includes(deviceType)) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'deviceType must be desktop, mobile, or web' },
      });
    }

    const now = new Date().toISOString();
    let device: DeviceRow | undefined;

    // Check if device with machineId already exists for this user
    if (machineId) {
      device = db
        .prepare('SELECT * FROM devices WHERE machine_id = ? AND user_id = ?')
        .get(machineId, request.user.id) as DeviceRow | undefined;

      if (device) {
        // Update existing device
        db.prepare(
          'UPDATE devices SET device_name = ?, capabilities = ?, is_online = 1, last_seen = ?, app_version = ? WHERE id = ?',
        ).run(
          deviceName,
          JSON.stringify(capabilities ?? { canExecute: false, repos: [] }),
          now,
          appVersion ?? null,
          device.id,
        );

        device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device.id) as DeviceRow;
        const formatted = formatDevice(device);

        // Broadcast device online
        broadcast('devices', 'updated', device.id, formatted);

        return formatted;
      }
    }

    // Create new device
    const deviceId = nanoid();
    db.prepare(
      'INSERT INTO devices (id, machine_id, user_id, device_type, device_name, capabilities, is_online, last_seen, app_version, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
    ).run(
      deviceId,
      machineId ?? null,
      request.user.id,
      deviceType,
      deviceName,
      JSON.stringify(capabilities ?? { canExecute: false, repos: [] }),
      now,
      appVersion ?? null,
      now,
    );

    device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as DeviceRow;
    const formatted = formatDevice(device);

    // Broadcast device created
    broadcast('devices', 'created', deviceId, formatted);

    return reply.status(201).send(formatted);
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/devices — List user's devices
  // ─────────────────────────────────────────────────────────────
  app.get('/api/devices', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const devices = db
      .prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC')
      .all(request.user.id) as DeviceRow[];

    return {
      devices: devices.map(formatDevice),
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/devices/:id — Get single device
  // ─────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/devices/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const device = db
      .prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as DeviceRow | undefined;

    if (!device) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Device not found' },
      });
    }

    return formatDevice(device);
  });

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/devices/:id — Update device
  // ─────────────────────────────────────────────────────────────
  app.patch<{
    Params: { id: string };
    Body: {
      deviceName?: string;
      capabilities?: Partial<{ canExecute: boolean; repos: string[] }>;
      isOnline?: boolean;
      appVersion?: string;
    };
  }>('/api/devices/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const device = db
      .prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as DeviceRow | undefined;

    if (!device) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Device not found' },
      });
    }

    const { deviceName, capabilities, isOnline, appVersion } = request.body;
    const now = new Date().toISOString();

    // Merge capabilities
    let newCapabilities = JSON.parse(device.capabilities);
    if (capabilities) {
      newCapabilities = { ...newCapabilities, ...capabilities };
    }

    // Build update
    const updates: string[] = [];
    const values: unknown[] = [];

    if (deviceName !== undefined) {
      updates.push('device_name = ?');
      values.push(deviceName);
    }

    if (capabilities !== undefined) {
      updates.push('capabilities = ?');
      values.push(JSON.stringify(newCapabilities));
    }

    if (isOnline !== undefined) {
      updates.push('is_online = ?');
      values.push(isOnline ? 1 : 0);
      if (isOnline) {
        updates.push('last_seen = ?');
        values.push(now);
      }
    }

    if (appVersion !== undefined) {
      updates.push('app_version = ?');
      values.push(appVersion);
    }

    if (updates.length === 0) {
      return formatDevice(device);
    }

    values.push(request.params.id);
    db.prepare(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(request.params.id) as DeviceRow;
    const formatted = formatDevice(updated);

    // Broadcast update
    broadcast('devices', 'updated', request.params.id, formatted);

    return formatted;
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/devices/:id — Remove device
  // ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/api/devices/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const device = db
      .prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as DeviceRow | undefined;

    if (!device) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Device not found' },
      });
    }

    // Delete associated sessions
    db.prepare('DELETE FROM sessions WHERE device_id = ?').run(request.params.id);

    // Delete device
    db.prepare('DELETE FROM devices WHERE id = ?').run(request.params.id);

    // Broadcast deletion
    broadcast('devices', 'deleted', request.params.id, { id: request.params.id });

    return reply.status(204).send();
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/devices/:id/heartbeat — Update device online status
  // ─────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/devices/:id/heartbeat', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const device = db
      .prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as DeviceRow | undefined;

    if (!device) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Device not found' },
      });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE devices SET is_online = 1, last_seen = ? WHERE id = ?').run(
      now,
      request.params.id,
    );

    return { success: true, lastSeen: now };
  });
}
