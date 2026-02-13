import type { FastifyInstance } from 'fastify';

import { githubWebhookRoutes } from './github.js';
import { slackWebhookRoutes } from './slack.js';

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  await app.register(slackWebhookRoutes);
  await app.register(githubWebhookRoutes);
}
