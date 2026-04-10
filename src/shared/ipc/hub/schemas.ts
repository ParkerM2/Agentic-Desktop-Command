/**
 * Hub IPC Schemas
 *
 * Zod schemas for Hub connection, WebSocket status, and Hub entity
 * operations (excluding hub.tasks.* which lives in the tasks domain).
 */

import { z } from 'zod';

// ─── Hub Connection Schemas ───────────────────────────────────

export const HubConnectionStatusSchema = z.enum(['connected', 'disconnected', 'connecting', 'error']);

export const HubStatusOutputSchema = z.object({
  status: HubConnectionStatusSchema,
  hubUrl: z.string().optional(),
  enabled: z.boolean(),
  lastConnected: z.string().optional(),
  pendingMutations: z.number(),
});

export const HubConfigOutputSchema = z.object({
  hubUrl: z.string().optional(),
  enabled: z.boolean(),
  lastConnected: z.string().optional(),
});

export const HubSyncOutputSchema = z.object({
  syncedCount: z.number(),
  pendingCount: z.number(),
});

// ─── Device Schemas (absorbed from misc/devices) ──────────────

export const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'web']);

export const DeviceCapabilitiesSchema = z.object({
  canExecute: z.boolean(),
  repos: z.array(z.string()),
});

export const DeviceSchema = z.object({
  id: z.string(),
  machineId: z.string().optional(),
  userId: z.string(),
  deviceType: DeviceTypeSchema,
  deviceName: z.string(),
  nickname: z.string().optional(),
  capabilities: DeviceCapabilitiesSchema,
  isOnline: z.boolean(),
  lastSeen: z.string().optional(),
  appVersion: z.string().optional(),
  createdAt: z.string(),
});
