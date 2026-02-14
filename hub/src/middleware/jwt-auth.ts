import type { FastifyReply, FastifyRequest } from 'fastify';

import { verifyAccessToken } from '../lib/jwt.js';

// ─── Types ────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      deviceId?: string;
    };
  }
}

// ─── Public Routes ────────────────────────────────────────────

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/health',
  '/api/auth/generate-key', // Legacy API key generation
  '/api/auth/keys', // Legacy API key listing
];

// Routes that accept either API key OR JWT auth
const HYBRID_AUTH_ROUTES = [
  '/api/projects',
  '/api/tasks',
  '/api/settings',
  '/api/captures',
  '/api/agents',
  '/api/planner',
  '/api/webhooks',
];

function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some((route) => url.startsWith(route));
}

function isHybridRoute(url: string): boolean {
  return HYBRID_AUTH_ROUTES.some((route) => url.startsWith(route));
}

// ─── Middleware ───────────────────────────────────────────────

/**
 * JWT authentication middleware.
 *
 * This middleware:
 * 1. Skips public routes
 * 2. Allows hybrid routes to use either API key or JWT
 * 3. Requires JWT for protected routes
 * 4. Attaches user info to request
 */
export function createJwtAuthMiddleware() {
  return async function jwtAuthMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Skip WebSocket upgrade requests (handled separately)
    if (request.headers.upgrade === 'websocket') {
      return;
    }

    // Skip public routes
    if (isPublicRoute(request.url)) {
      return;
    }

    // For hybrid routes, check if API key middleware already authenticated
    // (the existing api-key middleware runs before this)
    if (isHybridRoute(request.url)) {
      // If no Authorization header, let API key middleware handle it
      if (!request.headers.authorization) {
        return;
      }
    }

    // Extract Bearer token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // For hybrid routes without JWT, let API key handle it
      if (isHybridRoute(request.url)) {
        return;
      }

      await reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
        },
      });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    // Verify JWT
    const payload = await verifyAccessToken(token);
    if (!payload) {
      await reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired access token',
        },
      });
      return;
    }

    // Attach user info to request
    request.user = {
      id: payload.sub,
      deviceId: payload.deviceId,
    };
  };
}

/**
 * Require authentication decorator.
 * Use this on routes that must be authenticated.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user) {
    await reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }
}
