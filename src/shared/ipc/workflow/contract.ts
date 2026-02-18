/**
 * Workflow IPC Contract
 *
 * Defines invoke channels for workflow progress watching,
 * task launching, and session management.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const workflowInvoke = {
  'workflow.watchProgress': {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  'workflow.stopWatching': {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  'workflow.launch': {
    input: z.object({
      taskDescription: z.string(),
      projectPath: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), pid: z.number() }),
  },
  'workflow.isRunning': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ running: z.boolean() }),
  },
  'workflow.stop': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ stopped: z.boolean() }),
  },
} as const;
