/**
 * Relay IPC Schemas
 *
 * Zod schemas for the relay domain IPC channels. Covers project
 * claiming, remote session spawning/I/O, and claim lifecycle events.
 */

import { z } from 'zod';

// ── Core Enums ──────────────────────────────────────────────────

export const relaySessionStatusSchema = z.enum(['active', 'ended', 'disconnected']);

export const relaySessionSourceSchema = z.enum(['local', 'relay']);

export const relayStreamSchema = z.enum(['stdout', 'stderr']);

export const relayMessageTypeSchema = z.enum([
  'spawn',
  'input',
  'output',
  'kill',
  'ended',
  'resume',
]);

// ── Core Session Schema ────────────────────────────────────────

export const relaySessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  status: relaySessionStatusSchema,
  source: relaySessionSourceSchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
});

// ── Invoke Input Schemas ───────────────────────────────────────

export const relayClaimProjectInputSchema = z.object({
  projectId: z.string(),
});

export const relayReleaseProjectInputSchema = z.object({
  projectId: z.string(),
});

export const relayReclaimProjectInputSchema = z.object({
  projectId: z.string(),
});

export const relaySpawnSessionInputSchema = z.object({
  projectId: z.string(),
  agentRole: z.string(),
  prompt: z.string(),
  workDir: z.string(),
  taskId: z.string().optional(),
});

export const relaySendInputInputSchema = z.object({
  sessionId: z.string(),
  data: z.string(),
});

export const relayListSessionsInputSchema = z.object({
  projectId: z.string(),
});

export const relayGetSessionBufferInputSchema = z.object({
  sessionId: z.string(),
});

export const relayRenewClaimInputSchema = z.object({
  projectId: z.string(),
});

// ── Invoke Output Schemas ──────────────────────────────────────

export const relayClaimProjectOutputSchema = z.object({
  success: z.boolean(),
  claimedAt: z.string(),
  deviceId: z.string(),
});

export const relayReleaseProjectOutputSchema = z.object({
  success: z.boolean(),
});

export const relayReclaimProjectOutputSchema = z.object({
  success: z.boolean(),
  reclaimedAt: z.string(),
});

export const relaySpawnSessionOutputSchema = z.object({
  sessionId: z.string(),
});

export const relaySendInputOutputSchema = z.object({
  success: z.boolean(),
});

export const relayGetSessionBufferOutputSchema = z.object({
  sessionId: z.string(),
  buffer: z.string(),
});

export const relayRenewClaimOutputSchema = z.object({
  success: z.boolean(),
  renewedAt: z.string(),
});

// ── Event Payload Schemas ──────────────────────────────────────

export const relayProjectClaimedPayloadSchema = z.object({
  projectId: z.string(),
  claimedByDeviceId: z.string(),
  claimedAt: z.string(),
});

export const relayProjectUnclaimedPayloadSchema = z.object({
  projectId: z.string(),
  unclaimedAt: z.string(),
});

export const relaySessionSpawnedPayloadSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  agentRole: z.string(),
});

export const relaySessionOutputPayloadSchema = z.object({
  sessionId: z.string(),
  data: z.string(),
  stream: relayStreamSchema,
});

export const relaySessionEndedPayloadSchema = z.object({
  sessionId: z.string(),
  exitCode: z.number(),
  endedAt: z.string(),
});

export const relayClaimReclaimedPayloadSchema = z.object({
  projectId: z.string(),
  reclaimedByDeviceId: z.string(),
  reclaimedAt: z.string(),
});
