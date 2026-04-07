/**
 * WorkflowEngine IPC Contract
 *
 * Invoke channels: start, stop, get, list.
 * Event channels: stateChanged, completed, error.
 */

import { z } from 'zod';

import {
  AgentDefinitionSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const workflowEngineInvoke = {
  'workflow-engine.apply': {
    input: WorkflowApplyInputSchema,
    output: z.object({ runId: z.string() }),
  },
  'workflow-engine.start': {
    input: WorkflowRunConfigSchema,
    output: z.object({ runId: z.string() }),
  },
  'workflow-engine.stop': {
    input: z.object({ runId: z.string() }),
    output: z.object({ success: z.boolean(), message: z.string() }),
  },
  'workflow-engine.get': {
    input: z.object({ runId: z.string() }),
    output: WorkflowEngineRecordSchema.nullable(),
  },
  'workflow-engine.list': {
    input: z.object({}),
    output: z.array(WorkflowEngineRecordSchema),
  },
  'workflow-engine.listAgentDefs': {
    input: z.object({}),
    output: z.array(AgentDefinitionSchema),
  },
} as const;

// ─── Event Channels ────────────────────────────────────────────

export const workflowEngineEvents = {
  'event:workflow-engine.stateChanged': {
    payload: WorkflowStateChangedEventSchema,
  },
  'event:workflow-engine.completed': {
    payload: WorkflowCompletedEventSchema,
  },
  'event:workflow-engine.error': {
    payload: WorkflowErrorEventSchema,
  },
} as const;
