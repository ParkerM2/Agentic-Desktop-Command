/**
 * Hub IPC Contract
 *
 * Defines invoke channels for Hub connection management and WebSocket
 * status, plus Hub entity events (devices, workspaces, projects).
 * Excludes hub.tasks.* channels (those are in the tasks domain).
 */

import { z } from 'zod';

import { SuccessResponseSchema, SuccessWithErrorSchema } from '../common/schemas';

import { DEVICES, HUB, HUB_EVENTS } from './channels';
import {
  DeviceCapabilitiesSchema,
  DeviceSchema,
  DeviceTypeSchema,
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

// ─── Device Invoke Channels (absorbed from misc/devices) ──────

export const devicesInvoke = {
  [DEVICES.LIST.ALL]: {
    input: z.object({}),
    output: z.array(DeviceSchema),
  },
  [DEVICES.REGISTER.DEVICE]: {
    input: z.object({
      machineId: z.string(),
      deviceName: z.string(),
      deviceType: DeviceTypeSchema,
      capabilities: DeviceCapabilitiesSchema,
      appVersion: z.string(),
    }),
    output: DeviceSchema,
  },
  [DEVICES.HEARTBEAT.DEVICE]: {
    input: z.object({ deviceId: z.string() }),
    output: z.object({ success: z.boolean(), lastSeen: z.string() }),
  },
  [DEVICES.UPDATE.DEVICE]: {
    input: z.object({
      deviceId: z.string(),
      deviceName: z.string().optional(),
      nickname: z.string().optional(),
      capabilities: DeviceCapabilitiesSchema.optional(),
      isOnline: z.boolean().optional(),
      appVersion: z.string().optional(),
    }),
    output: DeviceSchema,
  },
} as const;
