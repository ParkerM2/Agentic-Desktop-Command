/**
 * Window IPC Schemas
 *
 * Zod schemas for window control operations:
 * minimize, maximize, close, and maximize state query.
 */

import { z } from 'zod';

export const WindowEmptyInputSchema = z.object({});

export const WindowIsMaximizedOutputSchema = z.object({
  isMaximized: z.boolean(),
});
