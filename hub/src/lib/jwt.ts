import { createHash, randomBytes } from 'node:crypto';

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// ─── Configuration ────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

// Convert secret to Uint8Array for jose
const secretKey = new TextEncoder().encode(JWT_SECRET);

// ─── Types ────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // user ID
  deviceId?: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // user ID
  sessionId: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// ─── Token Generation ─────────────────────────────────────────

export async function generateAccessToken(
  userId: string,
  deviceId?: string,
): Promise<{ token: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const token = await new SignJWT({
    sub: userId,
    deviceId,
    type: 'access',
  } satisfies AccessTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES)
    .sign(secretKey);

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function generateRefreshToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  const token = await new SignJWT({
    sub: userId,
    sessionId,
    type: 'refresh',
  } satisfies RefreshTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES)
    .sign(secretKey);

  return token;
}

export async function generateTokenPair(
  userId: string,
  sessionId: string,
  deviceId?: string,
): Promise<TokenPair> {
  const { token: accessToken, expiresAt } = await generateAccessToken(userId, deviceId);
  const refreshToken = await generateRefreshToken(userId, sessionId);

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

// ─── Token Verification ───────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    if (payload.type !== 'access') {
      return null;
    }

    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    if (payload.type !== 'refresh') {
      return null;
    }

    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// ─── Hash Utilities ───────────────────────────────────────────

/**
 * Hash a refresh token for storage.
 * Uses SHA-256 since we just need to verify equality, not reverse.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random session ID.
 */
export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Calculate session expiry date (7 days from now).
 */
export function getSessionExpiry(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}
