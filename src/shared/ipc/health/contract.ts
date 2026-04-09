/**
 * Health IPC Contract
 *
 * Defines invoke channels for error tracking and health monitoring:
 * error log retrieval, error stats, renderer error reporting,
 * and service health status.
 *
 * Note: channels use the `app.*` prefix via APP/APP_EVENTS constants
 * from the app domain, even though schemas live in the health/ domain folder.
 */

import { z } from 'zod';

import { APP, APP_EVENTS } from '../app/channels';
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
  [APP.GET['ERROR-LOG']]: {
    input: z.object({ since: z.string().optional() }),
    output: z.object({ entries: z.array(ErrorEntrySchema) }),
  },
  [APP.GET['ERROR-STATS']]: {
    input: z.object({}),
    output: ErrorStatsSchema,
  },
  [APP.CLEAR['ERROR-LOG']]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [APP.REPORT['RENDERER-ERROR']]: {
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
  [APP.GET['HEALTH-STATUS']]: {
    input: z.object({}),
    output: HealthStatusSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const healthEvents = {
  [APP_EVENTS.ERROR.OCCURRED]: {
    payload: ErrorEntrySchema,
  },
  [APP_EVENTS.CAPACITY.ALERT]: {
    payload: z.object({ count: z.number(), message: z.string() }),
  },
  [APP_EVENTS.DATA.RECOVERY]: {
    payload: z.object({ store: z.string(), message: z.string() }),
  },
  [APP_EVENTS.SERVICE.UNHEALTHY]: {
    payload: z.object({ serviceName: z.string(), missedCount: z.number() }),
  },
} as const;
