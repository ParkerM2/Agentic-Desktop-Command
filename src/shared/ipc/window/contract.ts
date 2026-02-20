/**
 * Window IPC Contract
 *
 * Invoke channel definitions for window control operations:
 * minimize, maximize/restore toggle, close, and maximize state query.
 */

import { z } from 'zod';

import { WindowEmptyInputSchema, WindowIsMaximizedOutputSchema } from './schemas';

/** Invoke channels for window control operations */
export const windowInvoke = {
  'window.minimize': {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  'window.maximize': {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  'window.close': {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  'window.isMaximized': {
    input: WindowEmptyInputSchema,
    output: WindowIsMaximizedOutputSchema,
  },
} as const;
