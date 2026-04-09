/**
 * Webhook IPC Contract
 *
 * Event channel for incoming webhook commands (Slack/GitHub).
 * Invoke channels for webhook config are in the settings domain.
 */

import { z } from 'zod';

import { WEBHOOK_EVENTS } from './webhook.channels';

export const webhookInvoke = {} as const;

export const webhookEvents = {
  [WEBHOOK_EVENTS.COMMAND.RECEIVED]: {
    payload: z.object({
      source: z.enum(['slack', 'github']),
      commandText: z.string(),
      sourceContext: z.record(z.string(), z.string()),
      timestamp: z.string(),
    }),
  },
} as const;
