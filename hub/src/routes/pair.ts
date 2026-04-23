import { createHash } from 'node:crypto';

import { createNonceStore, type NonceStore } from '../lib/nonce-store.js';
import {
  createAuditMiddleware,
  type AuditExtra,
} from '../middleware/audit.js';
import { createRateLimiter, type RateLimiter } from '../middleware/pair-rate-limit.js';

import type { AuditRepo } from '../lib/audit-repo.js';
import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export interface PairRoutesDeps {
  db: Database.Database;
  audit: AuditRepo;
  hubId: string;
  nonceStore?: NonceStore;
  initLimit?: RateLimiter;
  confirmLimit?: RateLimiter;
}

interface PairInitBody {
  clientId: string;
  clientPubKey: string;
  displayName?: string;
}

const DEFAULT_INIT_LIMIT = 20;
const DEFAULT_INIT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_CONFIRM_LIMIT = 20;
const DEFAULT_CONFIRM_WINDOW_MS = 60 * 60 * 1000;

const pairInitBodySchema = {
  type: 'object',
  required: ['clientId', 'clientPubKey'],
  additionalProperties: false,
  properties: {
    clientId: { type: 'string', minLength: 1, maxLength: 64 },
    clientPubKey: { type: 'string', minLength: 1, maxLength: 256 },
    displayName: { type: 'string', maxLength: 64 },
  },
} as const;

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function computePubkeyFingerprint(clientPubKey: string): string | null {
  try {
    const der = Buffer.from(clientPubKey, 'base64url');
    if (der.length === 0) return null;
    return createHash('sha256').update(der).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Pair routes — step 1 (init) of the two-step pair flow.
 *
 * POST /api/pair/init
 *   { clientId, clientPubKey, displayName? } ->
 *   200 { nonce, expiresAt }
 *   400 schema violation
 *   409 IdentityConflict (clientId bound to a different pubkey)
 *   429 rate-limited
 *
 * Must not be mounted behind api-key auth — /api/pair/* is on the bypass list
 * in `middleware/api-key.ts`.
 */
export function createPairRoutes(deps: PairRoutesDeps): FastifyPluginAsync {
  const { db, audit } = deps;

  const initLimit =
    deps.initLimit ??
    createRateLimiter({
      limit: parseEnvInt('HUB_PAIR_RATE_LIMIT_INIT', DEFAULT_INIT_LIMIT),
      windowMs: parseEnvInt(
        'HUB_PAIR_RATE_LIMIT_INIT_WINDOW_MS',
        DEFAULT_INIT_WINDOW_MS,
      ),
    });

  // Confirm limiter is plumbed through now so Task 10 can consume it.
  const confirmLimit =
    deps.confirmLimit ??
    createRateLimiter({
      limit: parseEnvInt('HUB_PAIR_RATE_LIMIT_CONFIRM', DEFAULT_CONFIRM_LIMIT),
      windowMs: parseEnvInt(
        'HUB_PAIR_RATE_LIMIT_CONFIRM_WINDOW_MS',
        DEFAULT_CONFIRM_WINDOW_MS,
      ),
    });

  const nonces = deps.nonceStore ?? createNonceStore();
  const auditEvent = createAuditMiddleware(audit);

  const selectApiKeyByClient = db.prepare(
    `SELECT pubkey_fp FROM api_keys
       WHERE client_id = ? AND revoked_at IS NULL
       LIMIT 1`,
  );
  const insertBinding = db.prepare(
    `INSERT OR IGNORE INTO client_bindings (client_id, pubkey_der, created_at)
       VALUES (?, ?, ?)`,
  );

  // Reference confirmLimit so it's retained as a closure binding for Task 10.
  // The `void` keeps ESLint happy without resorting to an `_unused` rename.
  void confirmLimit;

  // Plugin body intentionally has no top-level awaits; the Fastify plugin
  // contract requires an async function for typing, but route registration
  // itself is synchronous here.
  // eslint-disable-next-line @typescript-eslint/require-await
  const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.post<{ Body: PairInitBody }>(
      '/api/pair/init',
      { schema: { body: pairInitBodySchema } },
      async (request, reply) => {
        const limitResult = initLimit.take(request.ip);
        if (!limitResult.allowed) {
          auditEvent(request, 'pair.init', 'rate_limited', {
            reason: 'rate_limit_exceeded',
          });
          if (typeof limitResult.retryAfterMs === 'number') {
            void reply.header(
              'retry-after',
              Math.ceil(limitResult.retryAfterMs / 1000).toString(),
            );
          }
          await reply.status(429).send({ error: 'RateLimited' });
          return;
        }

        const { clientId, clientPubKey, displayName } = request.body;

        const pubkeyFp = computePubkeyFingerprint(clientPubKey);
        if (pubkeyFp === null) {
          auditEvent(request, 'pair.init', 'bad_signature', {
            clientId,
            displayName,
            reason: 'invalid_pubkey_encoding',
          });
          await reply.status(400).send({ error: 'InvalidPubKey' });
          return;
        }

        const existing = selectApiKeyByClient.get(clientId) as
          | { pubkey_fp: string | null }
          | undefined;
        if (
          existing !== undefined &&
          existing.pubkey_fp !== null &&
          existing.pubkey_fp !== pubkeyFp
        ) {
          const extra: AuditExtra = {
            clientId,
            displayName,
            pubkeyFp,
            reason: 'pubkey_fingerprint_mismatch',
          };
          auditEvent(request, 'pair.init', 'identity_conflict', extra);
          await reply.status(409).send({ error: 'IdentityConflict' });
          return;
        }

        const pubkeyDer = Buffer.from(clientPubKey, 'base64url');
        insertBinding.run(clientId, pubkeyDer, Date.now());

        const { nonce, expiresAt } = nonces.mint(clientId);

        auditEvent(request, 'pair.init', 'success', {
          clientId,
          displayName,
          pubkeyFp,
        });

        await reply.status(200).send({ nonce, expiresAt });
      },
    );
  };

  return plugin;
}
