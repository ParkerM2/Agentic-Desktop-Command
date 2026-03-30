/**
 * Agent Dashboard IPC Contract
 *
 * Invoke and event channel definitions for the ADC v2 agent dashboard.
 *
 * Invoke channels handle request/response operations (spawn, query, command).
 * Event channels handle push notifications from main to renderer.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  AgentChatMessageSchema,
  AgentDashboardStatusSchema,
  AgentSessionSchema,
  AgentSessionTypeSchema,
  FileChangeSchema,
  StreamJsonEventSchema,
  TeamMemberSchema,
} from './schemas';

// ── Invoke Channels ───────────────────────────────────────────

export const agentDashboardInvoke = {
  /** Spawn a headless stream-json Project Owner session */
  'agent-dashboard.spawnProjectOwner': {
    input: z.object({
      projectPath: z.string(),
      prompt: z.string(),
      model: z.string().optional(),
      name: z.string().optional(),
    }),
    output: z.object({
      sessionId: z.string(),
      status: z.literal('spawned'),
    }),
  },

  /** Spawn a tmux-based Team Lead session with Agent Teams enabled */
  'agent-dashboard.spawnTeamLead': {
    input: z.object({
      projectPath: z.string(),
      teamName: z.string(),
      prompt: z.string(),
      model: z.string().optional(),
      name: z.string().optional(),
    }),
    output: z.object({
      sessionId: z.string(),
      tmuxSessionName: z.string(),
      status: z.literal('spawned'),
    }),
  },

  /** List all active agent sessions across all types */
  'agent-dashboard.listSessions': {
    input: z.object({
      type: AgentSessionTypeSchema.optional(),
      teamName: z.string().optional(),
    }),
    output: z.array(AgentSessionSchema),
  },

  /** Get details for a single agent session */
  'agent-dashboard.getSession': {
    input: z.object({ sessionId: z.string() }),
    output: AgentSessionSchema.nullable(),
  },

  /** Send a message to an agent (stdin for PO, tmux send-keys for TL/teammates) */
  'agent-dashboard.sendMessage': {
    input: z.object({
      sessionId: z.string(),
      message: z.string(),
    }),
    output: SuccessResponseSchema,
  },

  /** Stop an agent session gracefully */
  'agent-dashboard.stopSession': {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },

  /** Get files changed on an agent's working branch */
  'agent-dashboard.getFilesChanged': {
    input: z.object({
      sessionId: z.string(),
      branch: z.string().optional(),
    }),
    output: z.array(FileChangeSchema),
  },
} as const;

// ── Event Channels ────────────────────────────────────────────

export const agentDashboardEvents = {
  /** A new agent session was detected or spawned */
  'event:agent-dashboard.sessionStarted': {
    payload: AgentSessionSchema,
  },

  /** An agent session has ended (completed, failed, or killed) */
  'event:agent-dashboard.sessionEnded': {
    payload: z.object({
      sessionId: z.string(),
      status: AgentDashboardStatusSchema,
      exitCode: z.number().optional(),
    }),
  },

  /** A new chat message was received from an agent */
  'event:agent-dashboard.messageReceived': {
    payload: AgentChatMessageSchema,
  },

  /** An agent's status changed */
  'event:agent-dashboard.statusChanged': {
    payload: z.object({
      sessionId: z.string(),
      previousStatus: AgentDashboardStatusSchema,
      newStatus: AgentDashboardStatusSchema,
    }),
  },

  /** A new teammate was detected via team config watcher */
  'event:agent-dashboard.teammateJoined': {
    payload: TeamMemberSchema,
  },

  /** A teammate left or was removed */
  'event:agent-dashboard.teammateLeft': {
    payload: z.object({
      agentId: z.string(),
      teamName: z.string(),
    }),
  },

  /** Token-level streaming delta for real-time UI updates */
  'event:agent-dashboard.streamEvent': {
    payload: z.object({
      sessionId: z.string(),
      event: StreamJsonEventSchema,
    }),
  },
} as const;
