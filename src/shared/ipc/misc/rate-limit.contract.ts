/**
 * Rate Limit IPC Contract
 *
 * Event channel for rate limit detection across providers.
 */

import { z } from 'zod';

export const rateLimitInvoke = {} as const;

export const rateLimitEvents = {
  'event:rateLimit.detected': {
    payload: z.object({
      taskId: z.string().optional(),
      provider: z.string(),
      retryAfter: z.number().optional(),
    }),
  },
} as const;
