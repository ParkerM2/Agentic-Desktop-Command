/**
 * Workflow Template IPC Contract
 *
 * Defines invoke channels for CRUD operations on workflow templates.
 * Templates are JSON files stored in .claude/templates/ (project-level)
 * and userData/templates/ (user-level).
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { WORKFLOW_TEMPLATES, WORKFLOW_TEMPLATES_EVENTS } from './channels';
import { ArtifactTypeSchema, PluginArtifactSchema, WorkflowTemplateSchema } from './schemas';

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

// ─── Invoke Channels ──────────────────────────────────────────

export const workflowTemplatesInvoke = {
  [WORKFLOW_TEMPLATES.LIST.ALL]: {
    input: z.object({}),
    output: z.object({ templates: z.array(WorkflowTemplateSchema) }),
  },
  [WORKFLOW_TEMPLATES.GET.TEMPLATE]: {
    input: z.object({ id: z.string() }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES.CREATE.TEMPLATE]: {
    input: CreateTemplateInputSchema,
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES.UPDATE.TEMPLATE]: {
    input: z.object({
      id: z.string(),
      updates: UpdateTemplateInputSchema,
    }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES.DELETE.TEMPLATE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [WORKFLOW_TEMPLATES.DUPLICATE.TEMPLATE]: {
    input: z.object({ id: z.string(), name: z.string().optional() }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  [WORKFLOW_TEMPLATES.SCAN.ARTIFACTS]: {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ artifacts: z.array(PluginArtifactSchema) }),
  },
  [WORKFLOW_TEMPLATES.WRITE.ARTIFACT]: {
    input: z.object({
      projectPath: z.string(),
      type: ArtifactTypeSchema,
      name: z.string().min(1),
      content: z.string(),
    }),
    output: z.object({ path: z.string() }),
  },
} as const;

// ─── Event Channels ──────────────────────────────────────────

export const workflowTemplatesEvents = {
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.CREATED]: {
    payload: z.object({ id: z.string(), name: z.string() }),
  },
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.UPDATED]: {
    payload: z.object({ id: z.string(), name: z.string() }),
  },
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.DELETED]: {
    payload: z.object({ id: z.string() }),
  },
} as const;
