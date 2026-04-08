/**
 * Relay IPC Contract
 *
 * Defines invoke channels for relay session management and
 * event channels for relay message streaming and claim lifecycle.
 */

import { z } from 'zod';

import { SuccessResponseSchema, SuccessWithErrorSchema } from '../common/schemas';

import {
  ProjectClaimEventSchema,
  ProjectUnclaimEventSchema,
  RelayEnvelopeSchema,
  RelayMessageTypeSchema,
  SessionEndedPayloadSchema,
  SessionOutputPayloadSchema,
  SessionSpawnPayloadSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const relayInvoke = {
  'relay.spawnSession': {
    input: z.object({
      hostDeviceId: z.string(),
      projectId: z.string(),
      payload: SessionSpawnPayloadSchema,
    }),
    output: z.object({ sessionId: z.string() }),
  },
  'relay.sendInput': {
    input: z.object({
      sessionId: z.string(),
      data: z.string(),
    }),
    output: SuccessResponseSchema,
  },
  'relay.killSession': {
    input: z.object({
      sessionId: z.string(),
      reason: z.string().optional(),
    }),
    output: SuccessResponseSchema,
  },
  'relay.resumeSession': {
    input: z.object({
      sessionId: z.string(),
    }),
    output: SuccessResponseSchema,
  },
  'relay.claimProject': {
    input: z.object({
      projectId: z.string(),
      hostDeviceId: z.string(),
    }),
    output: SuccessWithErrorSchema,
  },
  'relay.unclaimProject': {
    input: z.object({
      projectId: z.string(),
    }),
    output: SuccessResponseSchema,
  },
  'relay.sendEnvelope': {
    input: RelayEnvelopeSchema,
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const relayEvents = {
  'event:relay.messageReceived': {
    payload: RelayEnvelopeSchema,
  },
  'event:relay.sessionOutput': {
    payload: z.object({
      sessionId: z.string(),
      messageType: RelayMessageTypeSchema,
      output: SessionOutputPayloadSchema,
    }),
  },
  'event:relay.sessionSpawned': {
    payload: z.object({
      sessionId: z.string(),
      projectId: z.string(),
      payload: SessionSpawnPayloadSchema,
    }),
  },
  'event:relay.sessionEnded': {
    payload: z.object({
      sessionId: z.string(),
      projectId: z.string(),
      ended: SessionEndedPayloadSchema,
    }),
  },
  'event:relay.projectClaimed': {
    payload: ProjectClaimEventSchema,
  },
  'event:relay.projectUnclaimed': {
    payload: ProjectUnclaimEventSchema,
  },
} as const;
