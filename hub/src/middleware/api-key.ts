import { createHash } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Routes that use JWT auth (not API key auth)
const JWT_AUTH_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/health',
];

function isJwtAuthRoute(url: string): boolean {
  return JWT_AUTH_ROUTES.some((route) => url.startsWith(route));
}

export function createApiKeyMiddleware(db: Database.Database) {
  return async function apiKeyMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Skip for routes that use JWT auth instead of API keys
    if (isJwtAuthRoute(request.url)) {
      return;
    }

    // Skip auth for the generate-key endpoint when no keys exist
    if (request.url === '/api/auth/generate-key' && request.method === 'POST') {
      const row = db.prepare('SELECT COUNT(*) as count FROM api_keys').get() as
        | { count: number }
        | undefined;
      if (!row || row.count === 0) {
        return;
      }
    }

    // Skip auth for WebSocket upgrade requests (they use query param auth)
    if (request.url.startsWith('/ws')) {
      return;
    }

    // If request has Authorization header (Bearer token), skip API key check
    // and let the JWT middleware handle authentication
    if (request.headers.authorization?.startsWith('Bearer ')) {
      return;
    }

    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      await reply.status(401).send({ error: 'Missing X-API-Key header' });
      return;
    }

    const keyHash = hashKey(apiKey);
    const row = db
      .prepare('SELECT id FROM api_keys WHERE key_hash = ?')
      .get(keyHash) as { id: string } | undefined;

    if (!row) {
      await reply.status(401).send({ error: 'Invalid API key' });
      return;
    }
  };
}

export { hashKey };
