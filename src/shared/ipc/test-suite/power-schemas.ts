/**
 * Test Suite Power Feature Schemas
 *
 * Zod schemas for shared step groups, scheduled runs, and data-driven rows.
 * Mirrored by main-side store/service types in
 * `src/main/features/test-suite/{shared-steps-store,scheduler,data-runner}.ts`.
 */

import { z } from 'zod';

import { TestSuiteStepSchema } from './schemas';

export const SharedStepGroupSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  domain: z.string(),
  description: z.string().nullable(),
  steps: z.array(TestSuiteStepSchema),
  usageCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScheduleRecordSchema = z.object({
  id: z.string(),
  scriptId: z.string(),
  projectId: z.string(),
  intervalMs: z.number(),
  enabled: z.boolean(),
  lastRunAt: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DataRowSchema = z.record(z.string(), z.string());
