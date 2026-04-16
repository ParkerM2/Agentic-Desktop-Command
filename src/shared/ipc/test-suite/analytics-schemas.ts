/**
 * Test Suite Analytics — Zod Schemas
 *
 * Defines shapes for analytics payloads: trends, failures, flaky tests,
 * error patterns, slowest tests, summaries, and run history.
 */

import { z } from 'zod';

export const TrendPointSchema = z.object({
  date: z.string(),
  passed: z.number(),
  failed: z.number(),
  flaky: z.number(),
  total: z.number(),
});

export const TopFailureSchema = z.object({
  scriptId: z.string(),
  scriptName: z.string(),
  failureCount: z.number(),
  totalRuns: z.number(),
  failureRate: z.number(),
});

export const SlowestTestSchema = z.object({
  scriptId: z.string(),
  scriptName: z.string(),
  avgDurationMs: z.number(),
  maxDurationMs: z.number(),
  runCount: z.number(),
});

export const ErrorPatternSchema = z.object({
  pattern: z.string(),
  count: z.number(),
  scriptIds: z.array(z.string()),
  lastSeen: z.string(),
});

export const FlakySeveritySchema = z.enum(['low', 'medium', 'high']);

export const FlakyTestSchema = z.object({
  scriptId: z.string(),
  scriptName: z.string(),
  flakeRate: z.number(),
  severity: FlakySeveritySchema,
  recentResults: z.array(z.enum(['passed', 'failed'])),
});

export const AnalyticsSummarySchema = z.object({
  totalScripts: z.number(),
  totalRuns: z.number(),
  passRate: z.number(),
  avgDurationMs: z.number(),
  flakyCount: z.number(),
});

export const RunHistoryEntrySchema = z.object({
  status: z.string(),
  startedAt: z.string(),
  durationMs: z.number(),
});
