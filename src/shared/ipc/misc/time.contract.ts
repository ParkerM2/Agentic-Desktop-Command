/**
 * Time Parser IPC Contract
 *
 * Invoke channel for natural language time parsing.
 */

import { z } from 'zod';

export const timeInvoke = {
  'time.parse': {
    input: z.object({
      text: z.string(),
      referenceDate: z.string().optional(),
    }),
    output: z
      .object({
        iso: z.string(),
        text: z.string(),
        isRelative: z.boolean(),
      })
      .nullable(),
  },
} as const;

export const timeEvents = {} as const;
