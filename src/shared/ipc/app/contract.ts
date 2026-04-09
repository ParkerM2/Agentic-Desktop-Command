/**
 * App IPC Contract
 *
 * Defines invoke channels for application-level operations:
 * version info, Claude auth checks, OAuth status, auto-updater,
 * and open-at-login settings.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { APP, APP_EVENTS } from './channels';

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
