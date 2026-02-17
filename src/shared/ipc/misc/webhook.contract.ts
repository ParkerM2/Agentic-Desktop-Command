/**
 * Webhook IPC Contract
 *
 * Event channel for incoming webhook commands (Slack/GitHub).
 * Invoke channels for webhook config are in the settings domain.
 */

import { z } from 'zod';

export const webhookInvoke = {} as const;

export const webhookEvents = {
  'event:webhook.received': {
    payload: z.object({
      source: z.enum(['slack', 'github']),
      commandText: z.string(),
      sourceContext: z.record(z.string(), z.string()),
      timestamp: z.string(),
    }),
  },
} as const;
