/**
 * Health IPC Schemas
 *
 * Zod schemas for error tracking and service health monitoring.
 * Matches the TypeScript types defined in src/shared/types/health.ts.
 */

import { z } from 'zod';

/** Severity level of a collected error */
export const ErrorSeveritySchema = z.enum(['error', 'warning', 'info']);

/** Tier determines which error boundary catches the error */
export const ErrorTierSchema = z.enum(['app', 'project', 'personal']);

/** Category groups errors by subsystem origin */
export const ErrorCategorySchema = z.enum([
  'connection',
  'filesystem',
  'service',
  'agent',
  'ipc',
  'renderer',
  'general',
]);

/** Contextual information captured at the time of error */
export const ErrorContextSchema = z.object({
  route: z.string().optional(),
  routeHistory: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  task: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .optional(),
  agent: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

/** A single error entry in the error log */
export const ErrorEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  severity: ErrorSeveritySchema,
  tier: ErrorTierSchema,
  category: ErrorCategorySchema,
  message: z.string(),
  stack: z.string().optional(),
  context: ErrorContextSchema,
});

/** Aggregated error statistics */
export const ErrorStatsSchema = z.object({
  total: z.number(),
  byTier: z.record(ErrorTierSchema, z.number()),
  bySeverity: z.record(ErrorSeveritySchema, z.number()),
  last24h: z.number(),
});

/** Health status of an individual service */
export const ServiceHealthStatusSchema = z.enum(['healthy', 'unhealthy', 'stopped']);

/** Health snapshot for a single monitored service */
export const ServiceHealthSchema = z.object({
  name: z.string(),
  status: ServiceHealthStatusSchema,
  lastPulse: z.string(),
  missedCount: z.number(),
});

/** Aggregate health status for all monitored services */
export const HealthStatusSchema = z.object({
  services: z.array(ServiceHealthSchema),
});
