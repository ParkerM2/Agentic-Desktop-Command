/**
 * Time Parser IPC Contract
 *
 * Invoke channel for natural language time parsing.
 *
 * @dead The `time.parse` channel has a main-process handler but is never
 *       called from the renderer. Retained for potential future use.
 */

import { z } from 'zod';

import { TIME } from './time.channels';

export const timeInvoke = {
  [TIME.PARSE.EXPRESSION]: {
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
