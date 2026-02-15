import { nanoid } from 'nanoid';

import {
  generateSessionId,
  generateTokenPair,
  getSessionExpiry,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { hashPassword, validateEmail, validatePasswordStrength, verifyPassword } from '../lib/password.js';

import type Database from 'better-sqlite3';

// ─── Types ────────────────────────────────────────────────────

/** Raw user row from the database. */
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

/** Raw session row from the database. */
interface SessionRow {
  id: string;
  user_id: string;
  device_id: string | null;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

/** Public user data (no password_hash). */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  settings?: unknown;
  createdAt: string;
  lastLoginAt?: string;
}

/** Result from register or login operations. */
export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/** Result from token refresh. */
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/** Auth service error with HTTP-friendly code. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_REQUEST' | 'UNAUTHORIZED' | 'CONFLICT' | 'NOT_FOUND',
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** The public interface for the auth service. */
export interface AuthService {
  register: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  login: (email: string, password: string, deviceId?: string) => Promise<AuthResult>;
  verify: (accessToken: string) => Promise<PublicUser>;
  refresh: (refreshToken: string) => Promise<RefreshResult>;
  logout: (sessionId: string) => void;
  logoutByRefreshToken: (refreshToken: string) => Promise<void>;
  logoutAllSessions: (userId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatUser(row: UserRow): PublicUser {
  const user: PublicUser = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };

  if (row.avatar_url) {
    user.avatarUrl = row.avatar_url;
  }

  if (row.settings) {
    user.settings = JSON.parse(row.settings) as unknown;
  }

  if (row.last_login_at) {
    user.lastLoginAt = row.last_login_at;
  }

  return user;
}

function insertSession(
  db: Database.Database,
  sessionId: string,
  userId: string,
  refreshTokenHash: string,
  deviceId?: string,
): void {
  const now = new Date().toISOString();
  const sessionExpiry = getSessionExpiry();

  db.prepare(
    'INSERT INTO sessions (id, user_id, device_id, refresh_token_hash, expires_at, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(sessionId, userId, deviceId ?? null, refreshTokenHash, sessionExpiry, now, now);
}

// ─── Factory ──────────────────────────────────────────────────

export function createAuthService(db: Database.Database): AuthService {
  return {
    async register(email: string, password: string, displayName: string): Promise<AuthResult> {
      // Validate email format
      if (!email || !validateEmail(email)) {
        throw new AuthError('Invalid email address', 'INVALID_REQUEST', 400);
      }

      // Validate password strength
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        throw new AuthError(passwordCheck.reason ?? 'Invalid password', 'INVALID_REQUEST', 400);
      }

      // Validate display name
      if (!displayName || displayName.trim().length < 2) {
        throw new AuthError(
          'Display name must be at least 2 characters',
          'INVALID_REQUEST',
          400,
        );
      }

      // Check email uniqueness
      const existing = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(email.toLowerCase()) as { id: string } | undefined;

      if (existing) {
        throw new AuthError('Email already registered', 'CONFLICT', 409);
      }

      // Hash password with Argon2id
      const passwordHash = await hashPassword(password);
      const userId = nanoid();
      const now = new Date().toISOString();

      // Insert user
      db.prepare(
        'INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(userId, email.toLowerCase(), passwordHash, displayName.trim(), now);

      // Create session and issue tokens
      const sessionId = generateSessionId();
      const tokens = await generateTokenPair(userId, sessionId);
      const refreshTokenHash = hashToken(tokens.refreshToken);
      insertSession(db, sessionId, userId, refreshTokenHash);

      // Fetch created user
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;

      return {
        user: formatUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      };
    },

    async login(email: string, password: string, deviceId?: string): Promise<AuthResult> {
      if (!email || !password) {
        throw new AuthError('Email and password are required', 'INVALID_REQUEST', 400);
      }

      // Find user by email
      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email.toLowerCase()) as UserRow | undefined;

      if (!user) {
        throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);
      }

      // Verify password
      const validPassword = await verifyPassword(password, user.password_hash);
      if (!validPassword) {
        throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);
      }

      const now = new Date().toISOString();

      // Create session and issue tokens
      const sessionId = generateSessionId();
      const tokens = await generateTokenPair(user.id, sessionId, deviceId);
      const refreshTokenHash = hashToken(tokens.refreshToken);
      insertSession(db, sessionId, user.id, refreshTokenHash, deviceId);

      // Update last_login_at
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

      return {
        user: formatUser({ ...user, last_login_at: now }),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      };
    },

    async verify(accessToken: string): Promise<PublicUser> {
      // Verify JWT signature and expiry
      const payload = await verifyAccessToken(accessToken);
      if (!payload) {
        throw new AuthError('Invalid or expired access token', 'UNAUTHORIZED', 401);
      }

      // Fetch user from database
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(payload.sub) as UserRow | undefined;

      if (!user) {
        throw new AuthError('User not found', 'NOT_FOUND', 404);
      }

      return formatUser(user);
    },

    async refresh(refreshToken: string): Promise<RefreshResult> {
      if (!refreshToken) {
        throw new AuthError('Refresh token is required', 'INVALID_REQUEST', 400);
      }

      // Verify refresh token JWT
      const payload = await verifyRefreshToken(refreshToken);
      if (!payload) {
        throw new AuthError('Invalid or expired refresh token', 'UNAUTHORIZED', 401);
      }

      // Find session by ID from the token payload
      const session = db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .get(payload.sessionId) as SessionRow | undefined;

      if (!session) {
        throw new AuthError('Session not found', 'UNAUTHORIZED', 401);
      }

      // Check session expiry
      if (new Date(session.expires_at) < new Date()) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
        throw new AuthError('Session expired', 'UNAUTHORIZED', 401);
      }

      // Verify the refresh token hash matches the stored hash
      const tokenHash = hashToken(refreshToken);
      if (tokenHash !== session.refresh_token_hash) {
        throw new AuthError('Invalid refresh token', 'UNAUTHORIZED', 401);
      }

      // Generate new token pair
      const newTokens = await generateTokenPair(
        payload.sub,
        payload.sessionId,
        session.device_id ?? undefined,
      );

      // Update session with new refresh token hash and expiry
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
    },

    logout(sessionId: string): void {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    },

    async logoutByRefreshToken(refreshToken: string): Promise<void> {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(payload.sessionId);
      }
    },

    logoutAllSessions(userId: string): void {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },
  };
}
