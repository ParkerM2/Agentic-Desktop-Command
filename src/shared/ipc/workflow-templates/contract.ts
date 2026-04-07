/**
 * Workflow Template IPC Contract
 *
 * Defines invoke channels for CRUD operations on workflow templates.
 * Templates are JSON files stored in .claude/templates/ (project-level)
 * and userData/templates/ (user-level).
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

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
  'workflowTemplates.list': {
    input: z.object({}),
    output: z.object({ templates: z.array(WorkflowTemplateSchema) }),
  },
  'workflowTemplates.get': {
    input: z.object({ id: z.string() }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  'workflowTemplates.create': {
    input: CreateTemplateInputSchema,
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  'workflowTemplates.update': {
    input: z.object({
      id: z.string(),
      updates: UpdateTemplateInputSchema,
    }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  'workflowTemplates.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  'workflowTemplates.duplicate': {
    input: z.object({ id: z.string(), name: z.string().optional() }),
    output: z.object({ template: WorkflowTemplateSchema }),
  },
  'workflowTemplates.scanArtifacts': {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ artifacts: z.array(PluginArtifactSchema) }),
  },
  'workflowTemplates.writeArtifact': {
    input: z.object({
      projectPath: z.string(),
      type: ArtifactTypeSchema,
      name: z.string().min(1),
      content: z.string(),
    }),
    output: z.object({ path: z.string() }),
  },
} as const;
