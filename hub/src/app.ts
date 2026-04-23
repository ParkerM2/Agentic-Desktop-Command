import { join } from 'node:path';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';

import { createDatabase } from './db/database.js';
import { resolveHubId } from './lib/hub-id.js';
import { verifyAccessToken } from './lib/jwt.js';
import { resolveTls, type TlsMaterial } from './lib/tls.js';
import { createApiKeyMiddleware, hashKey } from './middleware/api-key.js';
import { createJwtAuthMiddleware } from './middleware/jwt-auth.js';
import { agentRoutes } from './routes/agents.js';
import { authRoutes } from './routes/auth.js';
import { captureRoutes } from './routes/captures.js';
import { deviceRoutes } from './routes/devices.js';
import { plannerRoutes } from './routes/planner.js';
import { projectRoutes } from './routes/projects.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { settingsRoutes } from './routes/settings.js';
import { taskRoutes } from './routes/tasks.js';
import { webhookRoutes } from './routes/webhooks/index.js';
import { addAuthenticatedClient } from './ws/broadcaster.js';

import type Database from 'better-sqlite3';

/**
 * Validate CORS origin.
 * Allows: localhost:*, 127.0.0.1:*, file://, and any origins in HUB_ALLOWED_ORIGINS env var.
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  // If no origin (same-origin request or non-browser), allow
  if (!origin) {
    return true;
  }

  // Allow localhost and 127.0.0.1 (any port)
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('https://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://127.0.0.1:') ||
    origin.startsWith('file://')
  ) {
    return true;
  }

  // Check custom allowed origins from env
  const allowedOriginsEnv = process.env.HUB_ALLOWED_ORIGINS;
  if (allowedOriginsEnv) {
    const allowedOrigins = allowedOriginsEnv.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return true;
    }
  }

  return false;
}

/** WebSocket close codes for authentication errors. */
const WS_CLOSE_INVALID_KEY = 4001;
const WS_CLOSE_AUTH_TIMEOUT = 4002;

/** Timeout for receiving auth message (5 seconds). */
const WS_AUTH_TIMEOUT_MS = 5000;

interface WsApiKeyAuthMessage {
  type: 'auth';
  apiKey: string;
}

interface WsBearerAuthMessage {
  type: 'auth';
  bearerToken: string;
}

type WsAuthMessage = WsApiKeyAuthMessage | WsBearerAuthMessage;

function isValidAuthMessage(data: unknown): data is WsAuthMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (obj.type !== 'auth') {
    return false;
  }
  return typeof obj.apiKey === 'string' || typeof obj.bearerToken === 'string';
}

/**
 * Handle WebSocket authentication using first-message protocol.
 * Client must send one of:
 *   { type: "auth", apiKey: "..." }       — legacy API key auth
 *   { type: "auth", bearerToken: "..." }  — JWT bearer token auth
 * within 5 seconds.
 * - Valid credentials: add to broadcast pool
 * - Invalid credentials: close with code 4001
 * - Timeout: close with code 4002
 */
function handleWebSocketAuth(
  socket: import('ws').WebSocket,
  db: Database.Database,
): void {
  let authenticated = false;

  // Set up auth timeout
  const timeoutId = setTimeout(() => {
    if (!authenticated) {
      console.log('[WS] Auth timeout — closing connection');
      socket.close(WS_CLOSE_AUTH_TIMEOUT, 'Auth timeout');
    }
  }, WS_AUTH_TIMEOUT_MS);

  function authSuccess(): void {
    authenticated = true;
    clearTimeout(timeoutId);
    console.log('[WS] Client authenticated');
    addAuthenticatedClient(socket);
  }

  function authFailure(reason: string): void {
    console.log(`[WS] ${reason}`);
    clearTimeout(timeoutId);
    socket.close(WS_CLOSE_INVALID_KEY, reason);
  }

  // Handle first message for auth
  const handleMessage = (rawData: import('ws').RawData): void => {
    // Only process first message for auth
    if (authenticated) {
      return;
    }

    try {
      const data = JSON.parse(String(rawData)) as unknown;

      if (!isValidAuthMessage(data)) {
        authFailure('Invalid auth message');
        return;
      }

      // JWT bearer token auth
      if ('bearerToken' in data && typeof data.bearerToken === 'string') {
        void (async () => {
          try {
            const payload = await verifyAccessToken(data.bearerToken);
            if (payload) {
              authSuccess();
            } else {
              authFailure('Invalid bearer token');
            }
          } catch {
            authFailure('Bearer token verification failed');
          }
        })();
        return;
      }

      // Legacy API key auth
      if ('apiKey' in data && typeof data.apiKey === 'string') {
        const keyHash = hashKey(data.apiKey);
        const row = db
          .prepare('SELECT id FROM api_keys WHERE key_hash = ?')
          .get(keyHash) as { id: string } | undefined;

        if (!row) {
          authFailure('Invalid API key');
          return;
        }

        authSuccess();
        return;
      }

      authFailure('Invalid auth message');
    } catch {
      authFailure('Failed to parse auth message');
    }
  };

  socket.on('message', handleMessage);

  // Clean up timeout on close
  socket.on('close', () => {
    clearTimeout(timeoutId);
  });
}

export interface BuildAppOptions {
  /** Directory used for hub-id, TLS material, and (by default) the SQLite db. */
  dataDir?: string;
  /** Explicit SQLite path override; defaults to `<dataDir>/claude-ui.db`. */
  dbPath?: string;
  /** Reserved — advertised listen port for downstream consumers. Not used here. */
  port?: number;
}

export interface BuiltApp {
  app: FastifyInstance;
  hubId: string;
  tls: TlsMaterial;
}

export async function buildApp(options?: BuildAppOptions | string): Promise<BuiltApp> {
  // Backward-compatible: accept a bare dbPath string in addition to the options object.
  const opts: BuildAppOptions =
    typeof options === 'string' ? { dbPath: options } : options ?? {};

  const dataDir = opts.dataDir ?? join(process.cwd(), 'data');
  const hubId = resolveHubId(dataDir);
  const tls = await resolveTls(dataDir, hubId);

  const app = Fastify({
    logger: true,
    https: { cert: tls.cert, key: tls.key },
  });

  // Database
  const resolvedDbPath = opts.dbPath ?? join(dataDir, 'claude-ui.db');
  const db = createDatabase(resolvedDbPath);

  // Decorate Fastify instance with db
  app.decorate('db', db);

  // Graceful shutdown — close db on server close
  app.addHook('onClose', () => {
    db.close();
  });

  // CORS — explicit origins only
  await app.register(cors, {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
  });

  // Rate limiting — global limit: 100 requests/minute per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // Skip rate limiting for WebSocket upgrade requests
    keyGenerator: (request) => request.ip,
  });

  // WebSocket
  await app.register(websocket);

  // API key auth middleware (for legacy/hybrid routes)
  app.addHook('onRequest', createApiKeyMiddleware(db));

  // JWT auth middleware (for new user-based auth)
  app.addHook('onRequest', createJwtAuthMiddleware());

  // WebSocket route with first-message auth protocol
  app.register(async (wsApp) => {
    wsApp.get('/ws', { websocket: true }, (socket) => {
      handleWebSocketAuth(socket, db);
    });
  });

  // REST routes
  await app.register(projectRoutes);
  await app.register(taskRoutes);
  await app.register(settingsRoutes);
  await app.register(plannerRoutes);
  await app.register(captureRoutes);
  await app.register(agentRoutes);
  await app.register(webhookRoutes);
  await app.register(deviceRoutes);
  await app.register(workspaceRoutes);

  // Auth routes with stricter rate limiting (10 requests/minute per IP)
  await app.register(
    async (authApp) => {
      await authApp.register(rateLimit, {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request) => request.ip,
      });
      await authApp.register(authRoutes);
    },
  );

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return { app, hubId, tls };
}
