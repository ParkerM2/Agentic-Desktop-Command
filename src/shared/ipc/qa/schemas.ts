/**
 * QA System IPC Schemas
 *
 * Zod schemas for QA sessions, reports, verification suites,
 * and issue tracking.
 */

import { z } from 'zod';

export const QaModeSchema = z.enum(['quiet', 'full']);

export const QaSessionStatusSchema = z.enum([
  'building',
  'launching',
  'testing',
  'completed',
  'error',
]);

export const QaVerificationResultSchema = z.enum(['pass', 'fail']);

export const QaVerificationSuiteSchema = z.object({
  lint: QaVerificationResultSchema,
  typecheck: QaVerificationResultSchema,
  test: QaVerificationResultSchema,
  build: QaVerificationResultSchema,
  docs: QaVerificationResultSchema,
});

export const QaIssueSeveritySchema = z.enum(['critical', 'major', 'minor', 'cosmetic']);

export const QaIssueSchema = z.object({
  severity: QaIssueSeveritySchema,
  category: z.string(),
  description: z.string(),
  screenshot: z.string().optional(),
  location: z.string().optional(),
});

export const QaScreenshotSchema = z.object({
  label: z.string(),
  path: z.string(),
  timestamp: z.string(),
  annotated: z.boolean(),
});

export const QaResultSchema = z.enum(['pass', 'fail', 'warnings']);

export const QaReportSchema = z.object({
  result: QaResultSchema,
  checksRun: z.number(),
  checksPassed: z.number(),
  issues: z.array(QaIssueSchema),
  verificationSuite: QaVerificationSuiteSchema,
  screenshots: z.array(QaScreenshotSchema),
  duration: z.number(),
});

export const QaSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  mode: QaModeSchema,
  status: QaSessionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  report: QaReportSchema.optional(),
  screenshots: z.array(z.string()),
  agentSessionId: z.string().optional(),
});
