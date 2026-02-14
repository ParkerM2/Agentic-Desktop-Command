import { join } from 'node:path';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { createDatabase } from './db/database.js';
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

interface WsAuthMessage {
  type: 'auth';
  apiKey: string;
}

function isValidAuthMessage(data: unknown): data is WsAuthMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return obj.type === 'auth' && typeof obj.apiKey === 'string';
}

/**
 * Handle WebSocket authentication using first-message protocol.
 * Client must send { type: "auth", apiKey: "..." } within 5 seconds.
 * - Valid key: add to broadcast pool
 * - Invalid key: close with code 4001
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

  // Handle first message for auth
  const handleMessage = (rawData: import('ws').RawData): void => {
    // Only process first message for auth
    if (authenticated) {
      return;
    }

    try {
      const data = JSON.parse(String(rawData)) as unknown;

      if (!isValidAuthMessage(data)) {
        console.log('[WS] Invalid auth message format');
        clearTimeout(timeoutId);
        socket.close(WS_CLOSE_INVALID_KEY, 'Invalid auth message');
        return;
      }

      // Validate API key against database
      const keyHash = hashKey(data.apiKey);
      const row = db
        .prepare('SELECT id FROM api_keys WHERE key_hash = ?')
        .get(keyHash) as { id: string } | undefined;

      if (!row) {
        console.log('[WS] Invalid API key');
        clearTimeout(timeoutId);
        socket.close(WS_CLOSE_INVALID_KEY, 'Invalid API key');
        return;
      }

      // Auth successful — add to broadcast pool
      authenticated = true;
      clearTimeout(timeoutId);
      console.log('[WS] Client authenticated');
      addAuthenticatedClient(socket);
    } catch {
      console.log('[WS] Failed to parse auth message');
      clearTimeout(timeoutId);
      socket.close(WS_CLOSE_INVALID_KEY, 'Invalid auth message');
    }
  };

  socket.on('message', handleMessage);

  // Clean up timeout on close
  socket.on('close', () => {
    clearTimeout(timeoutId);
  });
}

export async function buildApp(dbPath?: string): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: true });

  // Database
  const resolvedDbPath = dbPath ?? join(process.cwd(), 'data', 'claude-ui.db');
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

  return app;
}
