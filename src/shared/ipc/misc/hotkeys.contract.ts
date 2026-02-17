/**
 * Hotkeys IPC Contract
 *
 * Invoke channels for getting, updating, and resetting keyboard shortcuts.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

export const hotkeysInvoke = {
  'hotkeys.get': {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
  'hotkeys.update': {
    input: z.object({
      hotkeys: z.record(z.string(), z.string()),
    }),
    output: SuccessResponseSchema,
  },
  'hotkeys.reset': {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
} as const;

export const hotkeysEvents = {} as const;
