import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { SessionKeySchema, WorkspaceSessionSchema } from './schemas';

export const workspaceInvoke = {
  'workspace.initProject': {
    input: z.object({ projectId: z.string(), projectPath: z.string() }),
    output: z.object({ primarySessionId: z.string(), teamLeadSessionId: z.string() }),
  },
  'workspace.getSessions': {
    input: z.object({ projectId: z.string() }),
    output: z.array(WorkspaceSessionSchema),
  },
  'workspace.spawnTeamLead': {
    input: z.object({ projectId: z.string(), planPath: z.string().optional() }),
    output: WorkspaceSessionSchema,
  },
  'workspace.stopTeamLead': {
    input: z.object({ projectId: z.string(), index: z.number().int().min(1) }),
    output: SuccessResponseSchema,
  },
  'workspace.sendMessage': {
    input: z.object({ sessionId: z.string(), message: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

export const workspaceEvents = {
  'event:workspace.sessionReady': {
    payload: z.object({ projectId: z.string(), sessionKey: SessionKeySchema, sessionId: z.string() }),
  },
  'event:workspace.sessionCrashed': {
    payload: z.object({ projectId: z.string(), sessionKey: SessionKeySchema, crashCount: z.number() }),
  },
  'event:workspace.sessionRestarted': {
    payload: z.object({ projectId: z.string(), sessionKey: SessionKeySchema, sessionId: z.string() }),
  },
} as const;
