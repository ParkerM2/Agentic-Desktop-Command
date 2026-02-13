import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { ApiKey } from '../lib/types.js';
import { hashKey } from '../middleware/api-key.js';

/** Validates the bootstrap secret header. Returns true if valid (or secret not configured). */
function validateBootstrapSecret(headerValue: string | string[] | undefined): boolean {
  const expectedSecret = process.env.HUB_BOOTSTRAP_SECRET;

  // If no secret is configured, allow the request (for dev convenience)
  if (!expectedSecret) {
    return true;
  }

  // Header must be a string
  if (typeof headerValue !== 'string') {
    return false;
  }

  // Length check required because timingSafeEqual throws if lengths differ
  if (headerValue.length !== expectedSecret.length) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(Buffer.from(headerValue), Buffer.from(expectedSecret));
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // POST /api/auth/generate-key — Generate new API key (only if no keys exist)
  app.post('/api/auth/generate-key', async (request, reply) => {
    // Check bootstrap secret if configured
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

    // Generate a cryptographically secure random key
    const rawKey = randomBytes(32).toString('hex');
    const keyHash = hashKey(rawKey);
    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO api_keys (id, key_hash, name, created_at) VALUES (?, ?, ?, ?)',
    ).run(id, keyHash, 'default', now);

    // Return the raw key — this is the only time it's shown
    return reply.status(201).send({ key: rawKey });
  });

  // GET /api/auth/keys — List API keys (metadata only, no hashes)
  app.get('/api/auth/keys', async () => {
    const keys = db
      .prepare('SELECT id, name, created_at FROM api_keys ORDER BY created_at DESC')
      .all() as Pick<ApiKey, 'id' | 'name' | 'created_at'>[];

    return keys;
  });
}
