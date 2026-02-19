/**
 * Agents IPC Contract
 *
 * Invoke and event channel definitions for the agent orchestrator.
 */

import { z } from 'zod';

import { OrchestratorSessionSchema } from './schemas';

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
