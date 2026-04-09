/**
 * Window IPC Contract
 *
 * Invoke channel definitions for window control operations:
 * minimize, maximize/restore toggle, close, and maximize state query.
 */

import { z } from 'zod';

import { WINDOW } from './channels';
import { WindowEmptyInputSchema, WindowIsMaximizedOutputSchema } from './schemas';

/** Invoke channels for window control operations */
export const windowInvoke = {
  [WINDOW.MINIMIZE.APP]: {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [WINDOW.MAXIMIZE.APP]: {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [WINDOW.CLOSE.APP]: {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [WINDOW.CHECK.MAXIMIZED]: {
    input: WindowEmptyInputSchema,
    output: WindowIsMaximizedOutputSchema,
  },
} as const;
