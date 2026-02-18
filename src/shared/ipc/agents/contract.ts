/**
 * Agents IPC Contract
 *
 * Invoke and event channel definitions for agent sessions and orchestrator.
 */

import { z } from 'zod';

import { TokenUsageSchema } from '../common/schemas';

import { AgentSessionSchema, AggregatedTokenUsageSchema, OrchestratorSessionSchema } from './schemas';

/** Invoke channels for agent session operations */
export const agentsInvoke = {
  'agents.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(AgentSessionSchema),
  },
  'agents.stop': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.pause': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.resume': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.listAll': {
    input: z.object({}),
    output: z.array(AgentSessionSchema),
  },
  'agents.getQueueStatus': {
    input: z.object({}),
    output: z.object({
      pending: z.array(
        z.object({
          id: z.string(),
          taskId: z.string(),
          projectId: z.string(),
          priority: z.number(),
          queuedAt: z.string(),
        }),
      ),
      running: z.array(z.string()),
      maxConcurrent: z.number(),
    }),
  },
  'agents.getTokenUsage': {
    input: z.object({}),
    output: AggregatedTokenUsageSchema,
  },
} as const;

/** Invoke channels for orchestrator operations */
export const orchestratorInvoke = {
  'agent.startPlanning': {
    input: z.object({
      taskId: z.string(),
      projectPath: z.string(),
      taskDescription: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.startExecution': {
    input: z.object({
      taskId: z.string(),
      projectPath: z.string(),
      taskDescription: z.string(),
      planRef: z.string().optional(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.killSession': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agent.restartFromCheckpoint': {
    input: z.object({ taskId: z.string(), projectPath: z.string() }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.getOrchestratorSession': {
    input: z.object({ taskId: z.string() }),
    output: OrchestratorSessionSchema.nullable(),
  },
  'agent.listOrchestratorSessions': {
    input: z.object({}),
    output: z.array(OrchestratorSessionSchema),
  },
} as const;

/** Event channels for agent-related events */
export const agentsEvents = {
  'event:agent.statusChanged': {
    payload: z.object({ agentId: z.string(), status: z.string(), taskId: z.string() }),
  },
  'event:agent.log': {
    payload: z.object({ agentId: z.string(), message: z.string() }),
  },
  'event:agent.queueChanged': {
    payload: z.object({
      pending: z.number(),
      running: z.number(),
      maxConcurrent: z.number(),
    }),
  },
  'event:agent.tokenUsage': {
    payload: z.object({
      agentId: z.string(),
      usage: TokenUsageSchema,
    }),
  },
} as const;

/** Event channels for orchestrator-related events */
export const orchestratorEvents = {
  'event:agent.orchestrator.progress': {
    payload: z.object({
      taskId: z.string(),
      type: z.string(),
      data: z.record(z.string(), z.unknown()),
      timestamp: z.string(),
    }),
  },
  'event:agent.orchestrator.planReady': {
    payload: z.object({
      taskId: z.string(),
      planSummary: z.string(),
      planFilePath: z.string(),
    }),
  },
  'event:agent.orchestrator.stopped': {
    payload: z.object({
      taskId: z.string(),
      reason: z.string(),
      exitCode: z.number(),
    }),
  },
  'event:agent.orchestrator.error': {
    payload: z.object({
      taskId: z.string(),
      error: z.string(),
    }),
  },
  'event:agent.orchestrator.heartbeat': {
    payload: z.object({
      taskId: z.string(),
      timestamp: z.string(),
    }),
  },
  'event:agent.orchestrator.watchdogAlert': {
    payload: z.object({
      type: z.enum(['warning', 'stale', 'dead', 'auth_failed']),
      sessionId: z.string(),
      taskId: z.string(),
      message: z.string(),
      suggestedAction: z.enum(['restart_checkpoint', 'restart_fresh', 'mark_error', 'retry_auth']),
      timestamp: z.string(),
    }),
  },
} as const;
