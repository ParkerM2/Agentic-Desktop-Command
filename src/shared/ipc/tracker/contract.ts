/**
 * Tracker IPC Contract
 *
 * Defines invoke channels for plan tracking operations:
 * list all plans, get a single plan, and update plan fields.
 */

import { z } from 'zod';

import { TrackerFileSchema, TrackerPlanSchema, TrackerPlanStatusSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const trackerInvoke = {
  'tracker.list': {
    input: z.object({}),
    output: TrackerFileSchema,
  },
  'tracker.get': {
    input: z.object({ key: z.string() }),
    output: TrackerPlanSchema.nullable(),
  },
  'tracker.update': {
    input: z.object({
      key: z.string(),
      status: TrackerPlanStatusSchema.optional(),
      branch: z.string().nullable().optional(),
      pr: z.number().nullable().optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: TrackerPlanSchema,
  },
} as const;
