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
