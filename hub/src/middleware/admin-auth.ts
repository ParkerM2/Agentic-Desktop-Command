import { timingSafeEqual } from 'node:crypto';

import { verify as argon2Verify } from '@node-rs/argon2';

import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create middleware that enforces `X-Admin-Key` header equal to the
 * current admin key (constant-time comparison). Intended for JSON
 * endpoints under `/api/admin/*`.
 */
export function createAdminKeyMiddleware(getCurrentKey: () => string) {
  return async function adminKeyAuth(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const header = req.headers['x-admin-key'];
    if (typeof header !== 'string' || header.length === 0) {
      await reply.status(401).send({ error: 'Missing X-Admin-Key header' });
      return;
    }
    const expected = getCurrentKey();
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await reply.status(401).send({ error: 'Invalid admin key' });
    }
  };
}

/**
 * Create middleware that enforces HTTP Basic auth against the given
 * admin user + argon2id password hash. Intended for the `/admin` HTML
 * UI. If either value is unset, responds 403 — the admin UI is
 * disabled until the operator configures credentials.
 */
export function createAdminBasicAuth(
  user: string | undefined,
  passwordHash: string | undefined,
) {
  return async function adminBasic(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (
      user === undefined ||
      user.length === 0 ||
      passwordHash === undefined ||
      passwordHash.length === 0
    ) {
      await reply
        .status(403)
        .send({ error: 'Admin UI disabled — set HUB_ADMIN_USER and HUB_ADMIN_PASSWORD_HASH' });
      return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      reply.header('WWW-Authenticate', 'Basic realm="ADC Hub Admin"');
      await reply.status(401).send({ error: 'Authentication required' });
      return;
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    const submittedUser = colonIndex >= 0 ? decoded.slice(0, colonIndex) : decoded;
    const submittedPass = colonIndex >= 0 ? decoded.slice(colonIndex + 1) : '';
    if (submittedUser !== user) {
      await reply.status(401).send({ error: 'Invalid credentials' });
      return;
    }
    try {
      const ok = await argon2Verify(passwordHash, submittedPass);
      if (!ok) {
        await reply.status(401).send({ error: 'Invalid credentials' });
      }
    } catch {
      await reply.status(500).send({ error: 'Admin auth misconfigured' });
    }
  };
}
