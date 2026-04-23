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

// ─── Hub Discovery / Pair Schemas ─────────────────────────────

export const hubRecordSchema = z.object({
  hubId: z.string(),
  displayName: z.string(),
  lastKnownUrl: z.string().nullable(),
  pinnedFingerprint: z.string().nullable(),
  addedAt: z.string(),
  lastConnectedAt: z.string().nullable(),
  status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
});

export const discoveredHubSchema = z.object({
  hubId: z.string(),
  displayName: z.string(),
  version: z.string(),
  channel: z.string(),
  addresses: z.array(z.string()),
  port: z.number(),
  fingerprint: z.string(),
  lastSeenAt: z.string(),
  stale: z.boolean(),
});

export const hubDiscoveredListOutputSchema = z.object({
  paired: z.array(hubRecordSchema),
  discovered: z.array(discoveredHubSchema),
  activeHubId: z.string().nullable(),
});

export const hubPairRequestInputSchema = z.object({
  hubId: z.string(),
  displayName: z.string().optional(),
});

export const hubPairRequestOutputSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), hubId: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export const hubSwitchActiveInputSchema = z.object({ hubId: z.string() });

export const hubManualPairInputSchema = z.object({
  url: z.url(),
  displayName: z.string().optional(),
});

export const hubRemoveRecordInputSchema = z.object({ hubId: z.string() });

export const hubDiscoveryChangedEventSchema = hubDiscoveredListOutputSchema;

export const hubActiveChangedEventSchema = z.object({
  activeHubId: z.string().nullable(),
});

export const hubRevokedEventSchema = z.object({
  hubId: z.string(),
  reason: z.string(),
});

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
  [HUB.DISCOVERED.LIST]: {
    input: z.object({}),
    output: hubDiscoveredListOutputSchema,
  },
  [HUB.PAIR.REQUEST]: {
    input: hubPairRequestInputSchema,
    output: hubPairRequestOutputSchema,
  },
  [HUB.SWITCH.ACTIVE]: {
    input: hubSwitchActiveInputSchema,
    output: SuccessResponseSchema,
  },
  [HUB.REMOVE.RECORD]: {
    input: hubRemoveRecordInputSchema,
    output: SuccessResponseSchema,
  },
  [HUB.MANUAL.PAIR]: {
    input: hubManualPairInputSchema,
    output: hubPairRequestOutputSchema,
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
  [HUB_EVENTS.DISCOVERY.CHANGED]: {
    payload: hubDiscoveryChangedEventSchema,
  },
  [HUB_EVENTS.ACTIVE.CHANGED]: {
    payload: hubActiveChangedEventSchema,
  },
  [HUB_EVENTS.REVOKED]: {
    payload: hubRevokedEventSchema,
  },
} as const;

