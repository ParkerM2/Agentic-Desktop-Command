/**
 * Dashboard IPC Schemas
 *
 * Zod schemas for quick capture CRUD operations.
 */

import { z } from 'zod';

export const CaptureSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
