/**
 * App IPC Contract
 *
 * Defines invoke channels for application-level operations:
 * version info, Claude auth checks, OAuth status, auto-updater,
 * and open-at-login settings.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const appInvoke = {
  'app.getVersion': {
    input: z.object({}),
    output: z.object({ version: z.string() }),
  },
  'app.checkClaudeAuth': {
    input: z.object({}),
    output: z.object({
      installed: z.boolean(),
      authenticated: z.boolean(),
      version: z.string().optional(),
    }),
  },
  'app.getOAuthStatus': {
    input: z.object({ provider: z.string() }),
    output: z.object({
      configured: z.boolean(),
      authenticated: z.boolean(),
    }),
  },
  'app.setOpenAtLogin': {
    input: z.object({ enabled: z.boolean() }),
    output: SuccessResponseSchema,
  },
  'app.getOpenAtLogin': {
    input: z.object({}),
    output: z.object({ enabled: z.boolean() }),
  },
  'app.checkForUpdates': {
    input: z.object({}),
    output: z.object({
      updateAvailable: z.boolean(),
      version: z.string().optional(),
    }),
  },
  'app.downloadUpdate': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'app.quitAndInstall': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'app.getUpdateStatus': {
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
  'event:app.updateAvailable': {
    payload: z.object({ version: z.string() }),
  },
  'event:app.updateDownloaded': {
    payload: z.object({ version: z.string() }),
  },
} as const;
