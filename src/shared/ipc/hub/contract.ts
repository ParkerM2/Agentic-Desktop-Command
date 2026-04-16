/**
 * Hub IPC Contract
 *
 * Defines invoke channels for Hub connection management and WebSocket
 * status, plus Hub entity events (devices, workspaces, projects).
 * Excludes hub.tasks.* channels (those are in the tasks domain).
 */

import { z } from 'zod';

import { SuccessResponseSchema, SuccessWithErrorSchema } from '../common/schemas';

import { HUB, HUB_EVENTS } from './channels';
import {
  HubConfigOutputSchema,
  HubConnectionStatusSchema,
  HubStatusOutputSchema,
  HubSyncOutputSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const hubInvoke = {
  [HUB.CONNECT.SERVER]: {
    input: z.object({ url: z.string(), apiKey: z.string() }),
    output: SuccessWithErrorSchema,
  },
  [HUB.DISCONNECT.SERVER]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [HUB.GET.STATUS]: {
    input: z.object({}),
    output: HubStatusOutputSchema,
  },
  [HUB.SYNC.DATA]: {
    input: z.object({}),
    output: HubSyncOutputSchema,
  },
  [HUB.GET.CONFIG]: {
    input: z.object({}),
    output: HubConfigOutputSchema,
  },
  [HUB.REMOVE.CONFIG]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [HUB.GENERATE.KEY]: {
    input: z.object({
      url: z.string(),
      bootstrapSecret: z.string().default(''),
    }),
    output: z.object({
      success: z.boolean(),
      key: z.string().optional(),
      error: z.string().optional(),
    }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const hubEvents = {
  [HUB_EVENTS.CONNECTION.CHANGED]: {
    payload: z.object({
      status: HubConnectionStatusSchema,
    }),
  },
  [HUB_EVENTS.SYNC.COMPLETED]: {
    payload: z.object({ entities: z.array(z.string()), syncedCount: z.number() }),
  },
  [HUB_EVENTS.DEVICE.ONLINE]: {
    payload: z.object({ deviceId: z.string(), name: z.string() }),
  },
  [HUB_EVENTS.DEVICE.OFFLINE]: {
    payload: z.object({ deviceId: z.string() }),
  },
  [HUB_EVENTS.WORKSPACE.UPDATED]: {
    payload: z.object({ workspaceId: z.string() }),
  },
  [HUB_EVENTS.PROJECT.UPDATED]: {
    payload: z.object({ projectId: z.string() }),
  },
} as const;

