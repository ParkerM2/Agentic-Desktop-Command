/**
 * Docker IPC Contract
 *
 * Channels for Docker Desktop detection and Hub auto-setup.
 */

import { z } from 'zod';

import { DockerHubSetupResultSchema, DockerStatusSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const dockerInvoke = {
  /** Check if Docker Desktop is installed and running. */
  'docker.getStatus': {
    input: z.object({}),
    output: DockerStatusSchema,
  },
  /** Auto-setup: pull image, start container, generate API key, connect. */
  'docker.setupHub': {
    input: z.object({}),
    output: DockerHubSetupResultSchema,
  },
} as const;
