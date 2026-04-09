/**
 * WorkflowEngine IPC Contract
 *
 * Invoke channels: start, stop, get, list.
 * Event channels: stateChanged, completed, error.
 */

import { z } from 'zod';

import { WORKFLOW_ENGINE, WORKFLOW_ENGINE_EVENTS } from './channels';
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
  [WORKFLOW_ENGINE.APPLY.TEMPLATE]: {
    input: WorkflowApplyInputSchema,
    output: z.object({ runId: z.string() }),
  },
  [WORKFLOW_ENGINE.START.RUN]: {
    input: WorkflowRunConfigSchema,
    output: z.object({ runId: z.string() }),
  },
  [WORKFLOW_ENGINE.STOP.RUN]: {
    input: z.object({ runId: z.string() }),
    output: z.object({ success: z.boolean(), message: z.string() }),
  },
  [WORKFLOW_ENGINE.GET.RUN]: {
    input: z.object({ runId: z.string() }),
    output: WorkflowEngineRecordSchema.nullable(),
  },
  [WORKFLOW_ENGINE.LIST.RUNS]: {
    input: z.object({}),
    output: z.array(WorkflowEngineRecordSchema),
  },
  [WORKFLOW_ENGINE.LIST.ARCHIVED]: {
    input: z.object({}),
    output: z.array(WorkflowEngineRecordSchema),
  },
  [WORKFLOW_ENGINE.LIST['AGENT-DEFS']]: {
    input: z.object({}),
    output: z.array(AgentDefinitionSchema),
  },
} as const;

// ─── Event Channels ────────────────────────────────────────────

export const workflowEngineEvents = {
  [WORKFLOW_ENGINE_EVENTS.STATE.CHANGED]: {
    payload: WorkflowStateChangedEventSchema,
  },
  [WORKFLOW_ENGINE_EVENTS.RUN.COMPLETED]: {
    payload: WorkflowCompletedEventSchema,
  },
  [WORKFLOW_ENGINE_EVENTS.RUN.ERROR]: {
    payload: WorkflowErrorEventSchema,
  },
} as const;
