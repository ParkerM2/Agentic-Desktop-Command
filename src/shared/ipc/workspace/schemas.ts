import { z } from 'zod';

export const SessionTypeSchema = z.enum(['primary', 'team-lead']);

export const SessionKeySchema = z.object({
  projectId: z.string(),
  type: SessionTypeSchema,
  index: z.number().int().nonnegative(),
});

export const WorkspaceSessionStatusSchema = z.enum([
  'starting',
  'live',
  'crashed',
  'restarting',
]);

export const WorkspaceSessionSchema = z.object({
  key: SessionKeySchema,
  agentSessionId: z.string(),
  projectPath: z.string(),
  model: z.string(),
  status: WorkspaceSessionStatusSchema,
  startedAt: z.number(),
  crashCount: z.number().int().nonnegative(),
});

export type SessionKey = z.infer<typeof SessionKeySchema>;
export type WorkspaceSession = z.infer<typeof WorkspaceSessionSchema>;
export type WorkspaceSessionStatus = z.infer<typeof WorkspaceSessionStatusSchema>;
