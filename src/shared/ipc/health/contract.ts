/**
 * Health IPC Contract
 *
 * Defines invoke channels for error tracking and health monitoring:
 * error log retrieval, error stats, renderer error reporting,
 * and service health status.
 *
 * Note: channels keep the `app.*` prefix for backward compatibility
 * even though schemas live in the health/ domain folder.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  ErrorCategorySchema,
  ErrorEntrySchema,
  ErrorSeveritySchema,
  ErrorStatsSchema,
  ErrorTierSchema,
  HealthStatusSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const healthInvoke = {
  'app.getErrorLog': {
    input: z.object({ since: z.string().optional() }),
    output: z.object({ entries: z.array(ErrorEntrySchema) }),
  },
  'app.getErrorStats': {
    input: z.object({}),
    output: ErrorStatsSchema,
  },
  'app.clearErrorLog': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'app.reportRendererError': {
    input: z.object({
      severity: ErrorSeveritySchema,
      tier: ErrorTierSchema,
      category: ErrorCategorySchema,
      message: z.string(),
      stack: z.string().optional(),
      route: z.string().optional(),
      routeHistory: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    }),
    output: SuccessResponseSchema,
  },
  'app.getHealthStatus': {
    input: z.object({}),
    output: HealthStatusSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const healthEvents = {
  'event:app.error': {
    payload: ErrorEntrySchema,
  },
  'event:app.capacityAlert': {
    payload: z.object({ count: z.number(), message: z.string() }),
  },
  'event:app.dataRecovery': {
    payload: z.object({ store: z.string(), message: z.string() }),
  },
  'event:app.serviceUnhealthy': {
    payload: z.object({ serviceName: z.string(), missedCount: z.number() }),
  },
} as const;
