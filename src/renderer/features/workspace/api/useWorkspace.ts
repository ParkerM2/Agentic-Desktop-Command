/**
 * Workspace React Query Hooks
 *
 * useWorkspaceSessions — polls workspace.getSessions, invalidates on IPC events.
 * useWorkspaceInit    — calls workspace.initProject when a project tab opens.
 * useWorkspaceSend    — mutation to send a message to a session.
 * useSpawnTeamLead    — mutation to spawn an additional Team Lead.
 * useStopTeamLead     — mutation to stop a mortal Team Lead.
 * useHandOffPlan      — mutation to hand off a plan to an idle or new team-lead.
 * useExecuteTask      — mutation to send an ad-hoc task to a team-lead.
 * useProvisionTeammate — mutation to provision a worktree for a teammate agent.
 * useTeardownTeammate  — mutation to tear down a teammate's worktree.
 *
 * Message streaming for each session reuses useAgentStream from agent-dashboard.
 */

import { useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { WORKSPACE, WORKSPACE_EVENTS } from '@shared/ipc/workspace/channels';
import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

export const workspaceKeys = {
  all: ['workspace'] as const,
  sessions: (projectId: string) => ['workspace', 'sessions', projectId] as const,
};

/** Poll active sessions for a project. Invalidates on session lifecycle events. */
export function useWorkspaceSessions(projectId: string | null) {
  const queryClient = useQueryClient();

  useIpcEvent(WORKSPACE_EVENTS.SESSION.READY, () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent(WORKSPACE_EVENTS.SESSION.CRASHED, () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent(WORKSPACE_EVENTS.SESSION.RESTARTED, () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent(WORKSPACE_EVENTS.PLAN['HANDED-OFF'], () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });

  return useQuery({
    queryKey: workspaceKeys.sessions(projectId ?? ''),
    queryFn: () => ipc(WORKSPACE.GET.SESSIONS, { projectId: projectId ?? '' }),
    enabled: projectId !== null,
  });
}

/** Call initProject when a project tab first opens. Idempotent on the backend. */
export function useWorkspaceInit(projectId: string | null, projectPath: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !projectPath) return;

    void (async () => {
      await ipc(WORKSPACE.INIT.PROJECT, { projectId, projectPath });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    })();
  }, [projectId, projectPath, queryClient]);
}

/** Send a message to a workspace session. */
export function useWorkspaceSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      ipc(WORKSPACE.SEND.MESSAGE, { sessionId, message }),

    onMutate: ({ sessionId, message }) => {
      const optimisticMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        agentId: sessionId,
        role: 'user',
        content: [{ type: 'text', text: message }],
        timestamp: new Date().toISOString(),
      };

      queryClient.setQueryData<AgentChatMessage[]>(
        ['agent-dashboard', 'messages', sessionId],
        (old) => [...(old ?? []), optimisticMessage],
      );

      return { optimisticId: optimisticMessage.id };
    },

    onError: (_err, { sessionId }, context) => {
      if (!context) return;
      queryClient.setQueryData<AgentChatMessage[]>(
        ['agent-dashboard', 'messages', sessionId],
        (old) => (old ?? []).filter((m) => m.id !== context.optimisticId),
      );
    },
  });
}

/** Spawn an additional mortal Team Lead. */
export function useSpawnTeamLead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planPath }: { planPath?: string }) =>
      ipc(WORKSPACE.SPAWN['TEAM-LEAD'], { projectId, planPath }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}

/** Stop a mortal Team Lead by index. */
export function useStopTeamLead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ index }: { index: number }) =>
      ipc(WORKSPACE.STOP['TEAM-LEAD'], { projectId, index }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}

/**
 * Hand off a plan to a team-lead for execution.
 * Reuses an idle team-lead or spawns a new one.
 */
export function useHandOffPlan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planPath, instructions }: { planPath: string; instructions?: string }) =>
      ipc(WORKSPACE.HANDOFF.PLAN, { projectId, planPath, instructions }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}

/**
 * Execute an ad-hoc task via a team-lead.
 * Reuses an idle team-lead or spawns a new one.
 */
export function useExecuteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskDescription,
      planPath,
    }: {
      taskDescription: string;
      planPath?: string;
    }) => ipc(WORKSPACE.EXECUTE.TASK, { projectId, taskDescription, planPath }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}

/**
 * Provision an isolated worktree for a teammate agent.
 * Called by components that manage team-lead → teammate spawning.
 */
export function useProvisionTeammate(projectId: string) {
  return useMutation({
    mutationFn: ({
      agentRole,
      slug,
      teamName,
      taskInstructions,
    }: {
      agentRole: string;
      slug: string;
      teamName: string;
      taskInstructions?: string;
    }) =>
      ipc(WORKSPACE.PROVISION.TEAMMATE, {
        projectId,
        agentRole,
        slug,
        teamName,
        taskInstructions,
      }),
  });
}

/**
 * Tear down a teammate's worktree after task completion.
 */
export function useTeardownTeammate(projectId: string) {
  return useMutation({
    mutationFn: ({ slug }: { slug: string }) =>
      ipc(WORKSPACE.TEARDOWN.TEAMMATE, { projectId, slug }),
  });
}
