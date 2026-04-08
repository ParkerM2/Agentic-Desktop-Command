/**
 * Relay IPC Schemas
 *
 * Zod schemas for relay message validation. These schemas mirror
 * the TypeScript interfaces in src/shared/types/relay.ts exactly.
 */

import { z } from 'zod';

// ─── Message Type ─────────────────────────────────────────────

export const RelayMessageTypeSchema = z.enum(['spawn', 'input', 'output', 'kill', 'ended', 'resume']);

// ─── Payload Schemas ──────────────────────────────────────────

export const SessionSpawnPayloadSchema = z.object({
  agentRole: z.string(),
  prompt: z.string(),
  workDir: z.string(),
  taskId: z.string(),
});

export const SessionInputPayloadSchema = z.object({
  sessionId: z.string(),
  data: z.string(),
});

export const SessionOutputPayloadSchema = z.object({
  sessionId: z.string(),
  data: z.string(),
  stream: z.enum(['stdout', 'stderr']),
});

export const SessionKillPayloadSchema = z.object({
  sessionId: z.string(),
  reason: z.string().optional(),
});

export const SessionEndedPayloadSchema = z.object({
  sessionId: z.string(),
  exitCode: z.number(),
  endedAt: z.string(),
});

export const SessionResumePayloadSchema = z.object({
  sessionId: z.string(),
});

// ─── Envelope Schema (discriminated union) ────────────────────

export const RelayEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('spawn'), sessionId: z.string(), payload: SessionSpawnPayloadSchema }),
  z.object({ type: z.literal('input'), sessionId: z.string(), payload: SessionInputPayloadSchema }),
  z.object({ type: z.literal('output'), sessionId: z.string(), payload: SessionOutputPayloadSchema }),
  z.object({ type: z.literal('kill'), sessionId: z.string(), payload: SessionKillPayloadSchema }),
  z.object({ type: z.literal('ended'), sessionId: z.string(), payload: SessionEndedPayloadSchema }),
  z.object({ type: z.literal('resume'), sessionId: z.string(), payload: SessionResumePayloadSchema }),
]);

// ─── Claim Event Schemas ──────────────────────────────────────

export const ProjectClaimEventSchema = z.object({
  projectId: z.string(),
  claimedByDeviceId: z.string(),
  claimedAt: z.string(),
});

export const ProjectUnclaimEventSchema = z.object({
  projectId: z.string(),
  unclaimedAt: z.string(),
});
