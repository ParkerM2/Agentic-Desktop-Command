import { z } from 'zod';

export const BaselineRecordSchema = z.object({
  id: z.string(),
  scriptId: z.string(),
  stepIndex: z.number(),
  stepLabel: z.string(),
  filePath: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DiffSensitivitySchema = z.enum(['strict', 'balanced', 'relaxed']);

export const DiffResultSchema = z.object({
  id: z.string(),
  runId: z.string(),
  baselineId: z.string(),
  screenshotId: z.string(),
  diffFilePath: z.string(),
  mismatchPercentage: z.number(),
  mismatchPixels: z.number(),
  threshold: z.number(),
  status: z.enum(['match', 'mismatch', 'size-mismatch']),
  createdAt: z.string(),
});
