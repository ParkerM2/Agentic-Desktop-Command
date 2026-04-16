/**
 * App IPC Contract
 *
 * Defines invoke channels for application-level operations:
 * version info, Claude auth checks, OAuth status, auto-updater,
 * open-at-login settings, error/health monitoring, Docker setup,
 * and window control.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { APP, APP_EVENTS, DOCKER, WINDOW } from './channels';
import {
  DockerHubSetupResultSchema,
  DockerStatusSchema,
  ErrorCategorySchema,
  ErrorEntrySchema,
  ErrorSeveritySchema,
  ErrorStatsSchema,
  ErrorTierSchema,
  HealthStatusSchema,
  WindowEmptyInputSchema,
  WindowIsMaximizedOutputSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const appInvoke = {
  [APP.GET.VERSION]: {
    input: z.object({}),
    output: z.object({ version: z.string() }),
  },
  [APP.CHECK['CLAUDE-AUTH']]: {
    input: z.object({}),
    output: z.object({
      installed: z.boolean(),
      authenticated: z.boolean(),
      version: z.string().optional(),
    }),
  },
  [APP.CHECK['OAUTH-STATUS']]: {
    input: z.object({ provider: z.string() }),
    output: z.object({
      configured: z.boolean(),
      authenticated: z.boolean(),
    }),
  },
  [APP.SET['LOGIN-SETTING']]: {
    input: z.object({ enabled: z.boolean() }),
    output: SuccessResponseSchema,
  },
  [APP.GET['LOGIN-SETTING']]: {
    input: z.object({}),
    output: z.object({ enabled: z.boolean() }),
  },
  [APP.LAUNCH['CLAUDE-AUTH']]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [APP.CHECK['GITHUB-AUTH']]: {
    input: z.object({}),
    output: z.object({
      installed: z.boolean(),
      authenticated: z.boolean(),
      username: z.string().optional(),
    }),
  },
  [APP.LAUNCH['GITHUB-AUTH']]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [APP.CHECK.UPDATES]: {
    input: z.object({}),
    output: z.object({
      updateAvailable: z.boolean(),
      version: z.string().optional(),
    }),
  },
  [APP.DOWNLOAD.UPDATE]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [APP.INSTALL.UPDATE]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [APP.GET['UPDATE-STATUS']]: {
    input: z.object({}),
    output: z.object({
      checking: z.boolean(),
      updateAvailable: z.boolean(),
      downloading: z.boolean(),
      downloaded: z.boolean(),
      version: z.string().optional(),
      error: z.string().optional(),
    }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const appEvents = {
  [APP_EVENTS.UPDATE.AVAILABLE]: {
    payload: z.object({ version: z.string() }),
  },
  [APP_EVENTS.UPDATE.DOWNLOADED]: {
    payload: z.object({ version: z.string() }),
  },
} as const;

// ─── Health Invoke Channels (absorbed from health/) ───────────

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

// ─── Health Event Channels (absorbed from health/) ────────────

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

// ─── Docker Invoke Channels (absorbed from docker/) ───────────

export const dockerInvoke = {
  [DOCKER.GET.STATUS]: {
    input: z.object({}),
    output: DockerStatusSchema,
  },
  [DOCKER.SETUP.HUB]: {
    input: z.object({}),
    output: DockerHubSetupResultSchema,
  },
  [DOCKER.RESET.HUB]: {
    input: z.object({}),
    output: DockerHubSetupResultSchema,
  },
} as const;

// ─── Window Invoke Channels (absorbed from window/) ───────────

export const windowInvoke = {
  [WINDOW.MINIMIZE.APP]: {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [WINDOW.MAXIMIZE.APP]: {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [WINDOW.CLOSE.APP]: {
    input: WindowEmptyInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [WINDOW.CHECK.MAXIMIZED]: {
    input: WindowEmptyInputSchema,
    output: WindowIsMaximizedOutputSchema,
  },
} as const;
