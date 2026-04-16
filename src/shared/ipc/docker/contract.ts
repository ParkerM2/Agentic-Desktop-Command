/**
 * Docker IPC Contract
 *
 * Channels for Docker Desktop detection and Hub auto-setup.
 */

import { z } from 'zod';

import { DOCKER } from './channels';
import { DockerHubSetupResultSchema, DockerStatusSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const dockerInvoke = {
  /** Check if Docker Desktop is installed and running. */
  [DOCKER.GET.STATUS]: {
    input: z.object({}),
    output: DockerStatusSchema,
  },
  /** Auto-setup: pull image, start container, generate API key, connect. */
  [DOCKER.SETUP.HUB]: {
    input: z.object({}),
    output: DockerHubSetupResultSchema,
  },
  /** Reset: stop + remove existing Hub container, recreate fresh, new API key. */
  [DOCKER.RESET.HUB]: {
    input: z.object({}),
    output: DockerHubSetupResultSchema,
  },
} as const;
