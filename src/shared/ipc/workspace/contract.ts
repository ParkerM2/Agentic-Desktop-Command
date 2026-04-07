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
  'workspace.initAllProjects': {
    input: z.object({
      projects: z.array(z.object({ id: z.string(), path: z.string() })),
    }),
    output: SuccessResponseSchema,
  },

  /**
   * Hand off a plan to a team-lead for execution.
   *
   * If an idle team-lead exists for this project, sends the plan to it.
   * Otherwise spawns a new mortal team-lead with the plan pre-loaded.
   * Returns the session that received the plan.
   */
  'workspace.handOffPlan': {
    input: z.object({
      projectId: z.string(),
      planPath: z.string(),
      /** Optional instructions to include alongside the plan */
      instructions: z.string().optional(),
    }),
    output: z.object({
      sessionId: z.string(),
      teamLeadIndex: z.number(),
      /** Whether a new team-lead was spawned or an existing one was reused */
      action: z.enum(['spawned', 'reused']),
    }),
  },

  /**
   * Execute a task by sending it to a team-lead.
   *
   * Similar to handOffPlan but for ad-hoc tasks without a plan file.
   * The team-lead receives the task description directly.
   */
  'workspace.executeTask': {
    input: z.object({
      projectId: z.string(),
      taskDescription: z.string(),
      /** Optional plan file for context */
      planPath: z.string().optional(),
    }),
    output: z.object({
      sessionId: z.string(),
      teamLeadIndex: z.number(),
      action: z.enum(['spawned', 'reused']),
    }),
  },

  /**
   * Provision an isolated worktree for a teammate agent.
   *
   * Called by the team-lead (via IPC) before spawning a teammate.
   * Returns the worktree path that should be used as the teammate's cwd.
   */
  'workspace.provisionTeammate': {
    input: z.object({
      projectId: z.string(),
      /** Agent role (e.g. 'component-engineer', 'service-engineer') */
      agentRole: z.string(),
      /** Unique slug for this teammate (e.g. 'task-1-component') */
      slug: z.string(),
      /** Team name this teammate belongs to */
      teamName: z.string(),
      /** Task-specific instructions for the teammate's CLAUDE.md */
      taskInstructions: z.string().optional(),
    }),
    output: z.object({
      worktreePath: z.string(),
      branch: z.string(),
    }),
  },

  /**
   * Tear down a teammate's worktree after task completion.
   */
  'workspace.teardownTeammate': {
    input: z.object({
      projectId: z.string(),
      slug: z.string(),
    }),
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
  /** Emitted when a plan is handed off to a team-lead */
  'event:workspace.planHandedOff': {
    payload: z.object({
      projectId: z.string(),
      planPath: z.string(),
      sessionId: z.string(),
      teamLeadIndex: z.number(),
    }),
  },
} as const;
