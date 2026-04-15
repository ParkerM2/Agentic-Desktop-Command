/**
 * Hotkeys IPC Contract
 *
 * Invoke channels for getting, updating, and resetting keyboard shortcuts.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { HOTKEYS } from './channels';

export const hotkeysInvoke = {
  [HOTKEYS.GET.CONFIG]: {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
  [HOTKEYS.UPDATE.CONFIG]: {
    input: z.object({
      hotkeys: z.record(z.string(), z.string()),
    }),
    output: SuccessResponseSchema,
  },
  [HOTKEYS.RESET.CONFIG]: {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
} as const;
