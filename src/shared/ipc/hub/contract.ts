/**
 * Hub IPC Contract
 *
 * Defines invoke channels for Hub connection management and WebSocket
 * status, plus Hub entity events (devices, workspaces, projects).
 * Excludes hub.tasks.* channels (those are in the tasks domain).
 */

import { z } from 'zod';

import { SuccessResponseSchema, SuccessWithErrorSchema } from '../common/schemas';

import {
  HubConfigOutputSchema,
  HubConnectionStatusSchema,
  HubStatusOutputSchema,
  HubSyncOutputSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const hubInvoke = {
  'hub.connect': {
    input: z.object({ url: z.string(), apiKey: z.string() }),
    output: SuccessWithErrorSchema,
  },
  'hub.disconnect': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'hub.getStatus': {
    input: z.object({}),
    output: HubStatusOutputSchema,
  },
  'hub.sync': {
    input: z.object({}),
    output: HubSyncOutputSchema,
  },
  'hub.getConfig': {
    input: z.object({}),
    output: HubConfigOutputSchema,
  },
  'hub.removeConfig': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const hubEvents = {
  'event:hub.connectionChanged': {
    payload: z.object({
      status: HubConnectionStatusSchema,
    }),
  },
  'event:hub.syncCompleted': {
    payload: z.object({ entities: z.array(z.string()), syncedCount: z.number() }),
  },
  'event:hub.devices.online': {
    payload: z.object({ deviceId: z.string(), name: z.string() }),
  },
  'event:hub.devices.offline': {
    payload: z.object({ deviceId: z.string() }),
  },
  'event:hub.workspaces.updated': {
    payload: z.object({ workspaceId: z.string() }),
  },
  'event:hub.projects.updated': {
    payload: z.object({ projectId: z.string() }),
  },
} as const;
