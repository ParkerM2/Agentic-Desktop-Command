/**
 * Workspaces IPC Contract
 *
 * Invoke channels for workspace CRUD operations.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { WORKSPACES } from './workspaces.channels';

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
  [WORKSPACES.LIST.ALL]: {
    input: z.object({}),
    output: z.array(WorkspaceSchema),
  },
  [WORKSPACES.CREATE.WORKSPACE]: {
    input: z.object({ name: z.string(), description: z.string().optional() }),
    output: WorkspaceSchema,
  },
  [WORKSPACES.UPDATE.WORKSPACE]: {
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      hostDeviceId: z.string().optional(),
      settings: WorkspaceSettingsSchema.partial().optional(),
    }),
    output: WorkspaceSchema,
  },
  [WORKSPACES.DELETE.WORKSPACE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;
