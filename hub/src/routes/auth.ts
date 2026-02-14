import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import {
  generateSessionId,
  generateTokenPair,
  getSessionExpiry,
  hashToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { hashPassword, validateEmail, validatePasswordStrength, verifyPassword } from '../lib/password.js';
import type { ApiKey } from '../lib/types.js';
import { hashKey } from '../middleware/api-key.js';

// ─── Types ────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  settings: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  device_id: string | null;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

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

function formatUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    settings: row.settings ? JSON.parse(row.settings) : undefined,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? undefined,
  };
}

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

// ─── Routes ───────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

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
    const { email, password, displayName } = request.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Invalid email address' },
      });
    }

    // Validate password
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: passwordCheck.reason },
      });
    }

    // Validate display name
    if (!displayName || displayName.trim().length < 2) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Display name must be at least 2 characters' },
      });
    }

    // Check if email already exists
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email.toLowerCase()) as { id: string } | undefined;

    if (existing) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'Email already registered' },
      });
    }

    // Create user
    const userId = nanoid();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, email.toLowerCase(), passwordHash, displayName.trim(), now);

    // Create session
    const sessionId = generateSessionId();
    const tokens = await generateTokenPair(userId, sessionId);
    const refreshTokenHash = hashToken(tokens.refreshToken);
    const sessionExpiry = getSessionExpiry();

    db.prepare(
      'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(sessionId, userId, refreshTokenHash, sessionExpiry, now, now);

    // Fetch created user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;

    return reply.status(201).send({
      user: formatUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
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
    const { email, password, deviceInfo } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Email and password are required' },
      });
    }

    // Find user
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase()) as UserRow | undefined;

    if (!user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
      });
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
      });
    }

    const now = new Date().toISOString();
    let device: DeviceRow | undefined;

    // Register or update device if deviceInfo provided
    if (deviceInfo) {
      if (deviceInfo.machineId) {
        // Check if device exists by machine ID
        device = db
          .prepare('SELECT * FROM devices WHERE machine_id = ? AND user_id = ?')
          .get(deviceInfo.machineId, user.id) as DeviceRow | undefined;

        if (device) {
          // Update existing device
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
        // Create new device
        const deviceId = nanoid();
        db.prepare(
          'INSERT INTO devices (id, machine_id, user_id, device_type, device_name, capabilities, is_online, last_seen, app_version, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
        ).run(
          deviceId,
          deviceInfo.machineId ?? null,
          user.id,
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

    // Create session
    const sessionId = generateSessionId();
    const tokens = await generateTokenPair(user.id, sessionId, device?.id);
    const refreshTokenHash = hashToken(tokens.refreshToken);
    const sessionExpiry = getSessionExpiry();

    db.prepare(
      'INSERT INTO sessions (id, user_id, device_id, refresh_token_hash, expires_at, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(sessionId, user.id, device?.id ?? null, refreshTokenHash, sessionExpiry, now, now);

    // Update last login
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

    const response: Record<string, unknown> = {
      user: formatUser({ ...user, last_login_at: now }),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };

    if (device) {
      response.device = formatDevice(device);
    }

    return response;
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/auth/logout — Invalidate session
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: { refreshToken?: string };
  }>('/api/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body;

    if (refreshToken) {
      // Verify and delete specific session
      const payload = await verifyRefreshToken(refreshToken);
      if (payload) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(payload.sessionId);
      }
    } else if (request.user) {
      // Delete all sessions for user (logout everywhere)
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(request.user.id);
    }

    return { success: true };
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/auth/refresh — Refresh access token
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: { refreshToken: string };
  }>('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Refresh token is required' },
      });
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
      });
    }

    // Find session
    const session = db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(payload.sessionId) as SessionRow | undefined;

    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Session not found' },
      });
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Session expired' },
      });
    }

    // Verify token hash matches
    const tokenHash = hashToken(refreshToken);
    if (tokenHash !== session.refresh_token_hash) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' },
      });
    }

    // Generate new tokens
    const newTokens = await generateTokenPair(
      payload.sub,
      payload.sessionId,
      session.device_id ?? undefined,
    );

    // Update session with new refresh token hash
    const now = new Date().toISOString();
    const newRefreshHash = hashToken(newTokens.refreshToken);
    const newExpiry = getSessionExpiry();

    db.prepare(
      'UPDATE sessions SET refresh_token_hash = ?, expires_at = ?, last_used_at = ? WHERE id = ?',
    ).run(newRefreshHash, newExpiry, now, session.id);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/auth/me — Get current user
  // ─────────────────────────────────────────────────────────────
  app.get('/api/auth/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(request.user.id) as UserRow | undefined;

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    const response: Record<string, unknown> = {
      user: formatUser(user),
    };

    // Include device info if authenticated with device
    if (request.user.deviceId) {
      const device = db
        .prepare('SELECT * FROM devices WHERE id = ?')
        .get(request.user.deviceId) as DeviceRow | undefined;

      if (device) {
        response.device = formatDevice(device);
      }
    }

    return response;
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
