import { join } from 'node:path';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

import { createDatabase } from './db/database.js';
import './lib/fastify.d.js';
import { createApiKeyMiddleware } from './middleware/api-key.js';
import { agentRoutes } from './routes/agents.js';
import { authRoutes } from './routes/auth.js';
import { captureRoutes } from './routes/captures.js';
import { plannerRoutes } from './routes/planner.js';
import { projectRoutes } from './routes/projects.js';
import { settingsRoutes } from './routes/settings.js';
import { taskRoutes } from './routes/tasks.js';
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
  await app.register(authRoutes);

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
