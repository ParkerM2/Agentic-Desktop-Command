import { join } from 'node:path';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { createDatabase } from './db/database.js';
import { createApiKeyMiddleware } from './middleware/api-key.js';
import { agentRoutes } from './routes/agents.js';
import { authRoutes } from './routes/auth.js';
import { captureRoutes } from './routes/captures.js';
import { plannerRoutes } from './routes/planner.js';
import { projectRoutes } from './routes/projects.js';
import { settingsRoutes } from './routes/settings.js';
import { taskRoutes } from './routes/tasks.js';
import { webhookRoutes } from './routes/webhooks/index.js';
import { addClient } from './ws/broadcaster.js';

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

  // CORS
  await app.register(cors, {
    origin: true,
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

  // API key auth middleware
  app.addHook('onRequest', createApiKeyMiddleware(db));

  // WebSocket route
  app.register(async (wsApp) => {
    wsApp.get('/ws', { websocket: true }, (socket) => {
      addClient(socket);
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
