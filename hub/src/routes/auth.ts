import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply } from 'fastify';
import { nanoid } from 'nanoid';

import type { ApiKey } from '../lib/types.js';
import { hashKey } from '../middleware/api-key.js';
import { requireAuth } from '../middleware/jwt-auth.js';
import { AuthError, createAuthService } from '../services/auth-service.js';

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
    capabilities: JSON.parse(row.capabilities) as unknown,
    isOnline: row.is_online === 1,
    lastSeen: row.last_seen ?? undefined,
    appVersion: row.app_version ?? undefined,
    createdAt: row.created_at,
  };
}

/** Validates the bootstrap secret header. Returns true if valid (or secret not configured). */
function validateBootstrapSecret(headerValue: string | string[] | undefined): boolean {
  const expectedSecret = process.env.HUB_BOOTSTRAP_SECRET;

  if (!expectedSecret) {
    return true;
  }

  if (typeof headerValue !== 'string') {
    return false;
  }

  if (headerValue.length !== expectedSecret.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(headerValue), Buffer.from(expectedSecret));
}

/**
 * Send an AuthError as a structured HTTP response.
 */
async function sendAuthError(reply: FastifyReply, error: AuthError): Promise<void> {
  await reply.status(error.statusCode).send({
    error: { code: error.code, message: error.message },
  });
}

// ─── Routes ───────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;
  const authService = createAuthService(db);

  // ─────────────────────────────────────────────────────────────
  // POST /api/auth/register — Create user account
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      email: string;
      password: string;
      displayName: string;
    };
  }>('/api/auth/register', async (request, reply) => {
    try {
      const { email, password, displayName } = request.body;
      const result = await authService.register(email, password, displayName);

      return reply.status(201).send({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        await sendAuthError(reply, error);
        return;
      }
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/auth/login — Login and get tokens
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      email: string;
      password: string;
      deviceInfo?: {
        machineId?: string;
        deviceName: string;
        deviceType: 'desktop' | 'mobile' | 'web';
        capabilities?: { canExecute: boolean; repos: string[] };
        appVersion?: string;
      };
    };
  }>('/api/auth/login', async (request, reply) => {
    try {
      const { email, password, deviceInfo } = request.body;

      // Authenticate via auth service
      const result = await authService.login(email, password, deviceInfo?.machineId);

      // Handle device registration/update (route-level concern)
      let device: DeviceRow | undefined;
      if (deviceInfo) {
        const now = new Date().toISOString();

        if (deviceInfo.machineId) {
          device = db
            .prepare('SELECT * FROM devices WHERE machine_id = ? AND user_id = ?')
            .get(deviceInfo.machineId, result.user.id) as DeviceRow | undefined;

          if (device) {
            db.prepare(
              'UPDATE devices SET device_name = ?, capabilities = ?, is_online = 1, last_seen = ?, app_version = ? WHERE id = ?',
            ).run(
              deviceInfo.deviceName,
              JSON.stringify(deviceInfo.capabilities ?? { canExecute: false, repos: [] }),
              now,
              deviceInfo.appVersion ?? null,
              device.id,
            );
            device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device.id) as DeviceRow;
          }
        }

        if (!device) {
          const deviceId = nanoid();
          db.prepare(
            'INSERT INTO devices (id, machine_id, user_id, device_type, device_name, capabilities, is_online, last_seen, app_version, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
          ).run(
            deviceId,
            deviceInfo.machineId ?? null,
            result.user.id,
            deviceInfo.deviceType,
            deviceInfo.deviceName,
            JSON.stringify(deviceInfo.capabilities ?? { canExecute: false, repos: [] }),
            now,
            deviceInfo.appVersion ?? null,
            now,
          );
          device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as DeviceRow;
        }
      }

      const response: Record<string, unknown> = {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      };

      if (device) {
        response.device = formatDevice(device);
      }

      return response;
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        await sendAuthError(reply, error);
        return;
      }
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/auth/logout — Invalidate session (requires auth)
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: { refreshToken?: string };
  }>('/api/auth/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { refreshToken } = request.body;

      if (refreshToken) {
        await authService.logoutByRefreshToken(refreshToken);
      } else if (request.user) {
        authService.logoutAllSessions(request.user.id);
      }

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        await sendAuthError(reply, error);
        return;
      }
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/auth/refresh — Refresh access token
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: { refreshToken: string };
  }>('/api/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body;
      const tokens = await authService.refresh(refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      };
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        await sendAuthError(reply, error);
        return;
      }
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/auth/me — Get current user (requires auth)
  // ─────────────────────────────────────────────────────────────
  app.get('/api/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // request.user is guaranteed by requireAuth
      const user = await authService.verify(
        // Re-fetch user from DB via the access token's user ID
        // Since requireAuth already validated the token, we can trust request.user
        // We use the service to get the full PublicUser object
        request.headers.authorization?.slice(7) ?? '',
      );

      const response: Record<string, unknown> = { user };

      // Include device info if authenticated with device
      if (request.user?.deviceId) {
        const device = db
          .prepare('SELECT * FROM devices WHERE id = ?')
          .get(request.user.deviceId) as DeviceRow | undefined;

        if (device) {
          response.device = formatDevice(device);
        }
      }

      return response;
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        await sendAuthError(reply, error);
        return;
      }
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Legacy: POST /api/auth/generate-key — Generate API key
  // ─────────────────────────────────────────────────────────────
  app.post('/api/auth/generate-key', async (request, reply) => {
    const bootstrapSecret = request.headers['x-bootstrap-secret'];
    if (!validateBootstrapSecret(bootstrapSecret)) {
      return reply.status(401).send({
        error: 'Invalid or missing X-Bootstrap-Secret header',
      });
    }

    const row = db.prepare('SELECT COUNT(*) as count FROM api_keys').get() as { count: number };

    if (row.count > 0) {
      return reply.status(403).send({
        error: 'API keys already exist. Cannot generate new keys via this endpoint.',
      });
    }

    const rawKey = randomBytes(32).toString('hex');
    const keyHash = hashKey(rawKey);
    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO api_keys (id, key_hash, name, created_at) VALUES (?, ?, ?, ?)',
    ).run(id, keyHash, 'default', now);

    return reply.status(201).send({ key: rawKey });
  });

  // ─────────────────────────────────────────────────────────────
  // Legacy: GET /api/auth/keys — List API keys
  // ─────────────────────────────────────────────────────────────
  app.get('/api/auth/keys', async () => {
    const keys = db
      .prepare('SELECT id, name, created_at FROM api_keys ORDER BY created_at DESC')
      .all() as Pick<ApiKey, 'id' | 'name' | 'created_at'>[];

    return keys;
  });
}
