import type { FastifyInstance, FastifyRequest } from 'fastify';
import { nanoid } from 'nanoid';

import type { Setting, WebhookCommand } from '../../lib/types.js';
import { validateSlackSignature } from '../../lib/webhook-validator.js';
import { broadcast } from '../../ws/broadcaster.js';

/** Maximum allowed age for Slack request timestamps (5 minutes). */
const MAX_TIMESTAMP_AGE_SECONDS = 300;

interface SlackSlashCommandBody {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  channel_id: string;
  channel_name: string;
  response_url: string;
  trigger_id: string;
}

interface SlackEventPayload {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    text: string;
    user: string;
    channel: string;
    ts: string;
    thread_ts?: string;
  };
}

function getSetting(db: FastifyInstance['db'], key: string): string | null {
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as Setting | undefined;
  return row?.value ?? null;
}

export async function slackWebhookRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // Slack sends URL-encoded form data for slash commands, but JSON for events.
  // We need the raw body for signature verification, so register a custom content-type parser.
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  /**
   * POST /api/webhooks/slack/commands — Slash command handler (/claude)
   */
  app.post('/api/webhooks/slack/commands', async (request: FastifyRequest, reply) => {
    const rawBody = request.body as string;
    const signingSecret = getSetting(db, 'slack.signingSecret');

    if (!signingSecret) {
      return reply.status(500).send({ error: 'Slack signing secret not configured' });
    }

    // Validate signature
    const timestamp = request.headers['x-slack-request-timestamp'] as string | undefined;
    const signature = request.headers['x-slack-signature'] as string | undefined;

    if (!timestamp || !signature) {
      return reply.status(401).send({ error: 'Missing Slack signature headers' });
    }

    // Guard against replay attacks
    const requestAge = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (requestAge > MAX_TIMESTAMP_AGE_SECONDS) {
      return reply.status(401).send({ error: 'Request timestamp too old' });
    }

    if (!validateSlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid Slack signature' });
    }

    // Parse URL-encoded body
    const params = new URLSearchParams(rawBody);
    const commandData: SlackSlashCommandBody = {
      command: params.get('command') ?? '',
      text: params.get('text') ?? '',
      user_id: params.get('user_id') ?? '',
      user_name: params.get('user_name') ?? '',
      channel_id: params.get('channel_id') ?? '',
      channel_name: params.get('channel_name') ?? '',
      response_url: params.get('response_url') ?? '',
      trigger_id: params.get('trigger_id') ?? '',
    };

    if (!commandData.text.trim()) {
      return reply.send({
        response_type: 'ephemeral',
        text: 'Usage: /claude <command text>',
      });
    }

    // Insert into webhook_commands
    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO webhook_commands (id, source, source_id, source_channel, source_url, command_text, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      'slack',
      commandData.user_id,
      commandData.channel_name,
      commandData.response_url,
      commandData.text,
      'pending',
      now,
    );

    const record = db.prepare('SELECT * FROM webhook_commands WHERE id = ?').get(id) as WebhookCommand;

    // Broadcast via WebSocket
    broadcast('webhook_command', 'created', id, record);

    // Respond with ephemeral Slack message (must be within 3 seconds)
    return reply.send({
      response_type: 'ephemeral',
      text: `\u2713 Got it \u2014 processing: "${commandData.text}"`,
    });
  });

  /**
   * POST /api/webhooks/slack/events — Event subscription handler
   * Handles URL verification challenge and app_mention events.
   */
  app.post('/api/webhooks/slack/events', async (request: FastifyRequest, reply) => {
    // Slack events are JSON
    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

    let payload: SlackEventPayload;
    try {
      payload = JSON.parse(rawBody) as SlackEventPayload;
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' });
    }

    // URL verification challenge — respond immediately without signature check
    if (payload.type === 'url_verification' && payload.challenge) {
      return reply.send({ challenge: payload.challenge });
    }

    // Validate signature for all other events
    const signingSecret = getSetting(db, 'slack.signingSecret');

    if (!signingSecret) {
      return reply.status(500).send({ error: 'Slack signing secret not configured' });
    }

    const timestamp = request.headers['x-slack-request-timestamp'] as string | undefined;
    const signature = request.headers['x-slack-signature'] as string | undefined;

    if (!timestamp || !signature) {
      return reply.status(401).send({ error: 'Missing Slack signature headers' });
    }

    const requestAge = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (requestAge > MAX_TIMESTAMP_AGE_SECONDS) {
      return reply.status(401).send({ error: 'Request timestamp too old' });
    }

    if (!validateSlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid Slack signature' });
    }

    // Handle event_callback
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;

      if (event.type === 'app_mention') {
        // Strip the bot mention prefix (e.g., "<@U12345> ") to get the command text
        const commandText = event.text.replace(/^<@[A-Z\d]+>\s*/i, '').trim();

        if (!commandText) {
          return reply.send({ ok: true });
        }

        const id = nanoid();
        const now = new Date().toISOString();

        db.prepare(
          `INSERT INTO webhook_commands (id, source, source_id, source_channel, source_url, command_text, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          'slack',
          event.user,
          event.channel,
          null,
          commandText,
          'pending',
          now,
        );

        const record = db.prepare('SELECT * FROM webhook_commands WHERE id = ?').get(id) as WebhookCommand;
        broadcast('webhook_command', 'created', id, record);
      }
    }

    return reply.send({ ok: true });
  });
}
