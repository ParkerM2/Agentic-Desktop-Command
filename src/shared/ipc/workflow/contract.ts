/**
 * Workflow IPC Contract
 *
 * Unified contract for the workflow domain, absorbing workflow-engine
 * and workflow-templates channels.
 *
 * Invoke channels:
 *   - Core: watch progress, launch, stop, check running
 *   - Engine: start/stop/get run, list runs, list archived, list agent-defs
 *   - Templates: list, get, create, update, delete, duplicate, scan, write
 *
 * Event channels:
 *   - Core: milestone, context, permission
 *   - Engine: state changed, run completed, run error
 *   - Templates: template created/updated/deleted
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  WORKFLOW,
  WORKFLOW_ENGINE_CHANNELS,
  WORKFLOW_ENGINE_EVENT_CHANNELS,
  WORKFLOW_EVENTS,
  WORKFLOW_TEMPLATES_CHANNELS,
  WORKFLOW_TEMPLATES_EVENT_CHANNELS,
} from './channels';
import {
  AgentDefinitionSchema,
  ArtifactTypeSchema,
  PluginArtifactSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
  WorkflowTemplateSchema,
} from './schemas';

// ─── Input helpers ────────────────────────────────────────────

const CreateTemplateInputSchema = WorkflowTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isBuiltin: true,
});

const UpdateTemplateInputSchema = WorkflowTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isBuiltin: true,
}).partial();

// ─── Event Channels ───────────────────────────────────────────

export const workflowEvents = {
  // Core workflow events
  [WORKFLOW_EVENTS.WORKFLOW.MILESTONE]: {
    payload: z.object({
      ticket: z.string(),
      run: z.string().nullable(),
      event: z.string(),
      agent: z.string().nullable(),
      ts: z.string(),
      data: z.record(z.string(), z.unknown()),
    }),
  },
  [WORKFLOW_EVENTS.WORKFLOW.CONTEXT]: {
    payload: z.object({
      ticket: z.string().nullable(),
      phase: z.enum(['research', 'plan', 'agent-team']).nullable(),
      runSlug: z.string().nullable(),
    }),
  },
  [WORKFLOW_EVENTS.WORKFLOW.PERMISSION]: {
    payload: z.object({
      ticket: z.string(),
      agent: z.string(),
      message: z.string(),
    }),
  },

  // Engine events (absorbed from workflow-engine)
  [WORKFLOW_ENGINE_EVENT_CHANNELS.STATE.CHANGED]: {
    payload: WorkflowStateChangedEventSchema,
  },
  [WORKFLOW_ENGINE_EVENT_CHANNELS.RUN.COMPLETED]: {
    payload: WorkflowCompletedEventSchema,
  },
  [WORKFLOW_ENGINE_EVENT_CHANNELS.RUN.ERROR]: {
    payload: WorkflowErrorEventSchema,
  },

  // Templates events (absorbed from workflow-templates)
  [WORKFLOW_TEMPLATES_EVENT_CHANNELS.TEMPLATE.CREATED]: {
    payload: z.object({ id: z.string(), name: z.string() }),
  },
  [WORKFLOW_TEMPLATES_EVENT_CHANNELS.TEMPLATE.UPDATED]: {
    payload: z.object({ id: z.string(), name: z.string() }),
  },
  [WORKFLOW_TEMPLATES_EVENT_CHANNELS.TEMPLATE.DELETED]: {
    payload: z.object({ id: z.string() }),
  },
} as const;

// ─── Invoke Channels ──────────────────────────────────────────

export const workflowInvoke = {
  // Core workflow invoke
  [WORKFLOW.WATCH.PROGRESS]: {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  [WORKFLOW.STOP.WATCHING]: {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  [WORKFLOW.LAUNCH.WORKFLOW]: {
    input: z.object({
      taskDescription: z.string(),
      projectPath: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), pid: z.number() }),
  },
  [WORKFLOW.CHECK.RUNNING]: {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ running: z.boolean() }),
  },
  [WORKFLOW.STOP.RUNNING]: {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ stopped: z.boolean() }),
  },

  // Engine invoke (absorbed from workflow-engine)
  [WORKFLOW_ENGINE_CHANNELS.APPLY.TEMPLATE]: {
    input: WorkflowApplyInputSchema,
    output: z.object({ runId: z.string() }),
  },
  [WORKFLOW_ENGINE_CHANNELS.START.RUN]: {
    input: WorkflowRunConfigSchema,
    output: z.object({ runId: z.string() }),
  },
  [WORKFLOW_ENGINE_CHANNELS.STOP.RUN]: {
    input: z.object({ runId: z.string() }),
    output: z.object({ success: z.boolean(), message: z.string() }),
  },
  [WORKFLOW_ENGINE_CHANNELS.GET.RUN]: {
    input: z.object({ runId: z.string() }),
    output: WorkflowEngineRecordSchema.nullable(),
  },
  [WORKFLOW_ENGINE_CHANNELS.LIST.RUNS]: {
    input: z.object({}),
    output: z.array(WorkflowEngineRecordSchema),
  },
  [WORKFLOW_ENGINE_CHANNELS.LIST.ARCHIVED]: {
    input: z.object({}),
    output: z.array(WorkflowEngineRecordSchema),
  },
  [WORKFLOW_ENGINE_CHANNELS.LIST['AGENT-DEFS']]: {
    input: z.object({}),
    output: z.array(AgentDefinitionSchema),
  },

  // Templates invoke (absorbed from workflow-templates)
  [WORKFLOW_TEMPLATES_CHANNELS.LIST.ALL]: {
    input: z.object({}),
    output: z.object({ templates: z.array(WorkflowTemplateSchema) }),
  },
  [WORKFLOW_TEMPLATES_CHANNELS.GET.TEMPLATE]: {
    input: z.object({ id: z.string() }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES_CHANNELS.CREATE.TEMPLATE]: {
    input: CreateTemplateInputSchema,
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES_CHANNELS.UPDATE.TEMPLATE]: {
    input: z.object({
      id: z.string(),
      updates: UpdateTemplateInputSchema,
    }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES_CHANNELS.DELETE.TEMPLATE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [WORKFLOW_TEMPLATES_CHANNELS.DUPLICATE.TEMPLATE]: {
    input: z.object({ id: z.string(), name: z.string().optional() }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES_CHANNELS.SCAN.ARTIFACTS]: {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ artifacts: z.array(PluginArtifactSchema) }),
  },
  [WORKFLOW_TEMPLATES_CHANNELS.WRITE.ARTIFACT]: {
    input: z.object({
      projectPath: z.string(),
      type: ArtifactTypeSchema,
      name: z.string().min(1),
      content: z.string(),
    }),
    output: z.object({ path: z.string() }),
  },
} as const;
