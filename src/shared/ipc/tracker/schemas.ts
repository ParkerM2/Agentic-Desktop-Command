/**
 * Tracker IPC Schemas
 *
 * Zod schemas for plan tracking operations.
 * Matches the TypeScript types defined in src/shared/types/tracker.ts.
 */

import { z } from 'zod';

/** Status values for tracked plans */
export const TrackerPlanStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'ARCHIVED',
  'TRACKING',
]);

/** A single plan entry in tracker.json */
export const TrackerPlanSchema = z.object({
  title: z.string(),
  status: TrackerPlanStatusSchema,
  planFile: z.string().nullable(),
  created: z.string(),
  statusChangedAt: z.string(),
  branch: z.string().nullable(),
  pr: z.number().nullable(),
  tags: z.array(z.string()),
});

/** The tracker.json v2 file structure */
export const TrackerFileSchema = z.object({
  version: z.number(),
  lastUpdated: z.string(),
  plans: z.record(z.string(), TrackerPlanSchema),
});
