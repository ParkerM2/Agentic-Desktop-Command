/**
 * Docker IPC Schemas
 *
 * Zod schemas for Docker auto-setup operations.
 */

import { z } from 'zod';

export const DockerStatusSchema = z.object({
  installed: z.boolean(),
  running: z.boolean(),
});

export const DockerHubSetupResultSchema = z.object({
  success: z.boolean(),
  url: z.string().optional(),
  apiKey: z.string().optional(),
  error: z.string().optional(),
  step: z.string().optional(),
});
