/**
 * Terminals IPC Schemas
 *
 * Zod schemas for terminal session management.
 */

import { z } from 'zod';

export const TerminalSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cwd: z.string(),
  projectPath: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
