/**
 * Workspaces IPC Contract
 *
 * Invoke channels for workspace CRUD operations.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

export const WorkspaceSettingsSchema = z.object({
  autoStart: z.boolean(),
  maxConcurrent: z.number(),
  defaultBranch: z.string(),
});

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  hostDeviceId: z.string().optional(),
  settings: WorkspaceSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspacesInvoke = {
  'workspaces.list': {
    input: z.object({}),
    output: z.array(WorkspaceSchema),
  },
  'workspaces.create': {
    input: z.object({ name: z.string(), description: z.string().optional() }),
    output: WorkspaceSchema,
  },
  'workspaces.update': {
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      hostDeviceId: z.string().optional(),
      settings: WorkspaceSettingsSchema.partial().optional(),
    }),
    output: WorkspaceSchema,
  },
  'workspaces.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

export const workspacesEvents = {} as const;
