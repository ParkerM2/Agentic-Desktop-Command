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

import { RELAY } from '@shared/ipc/relay/channels';
import { WORKSPACE, WORKSPACE_EVENTS } from '@shared/ipc/workspace/channels';

import { useIpcEvent, useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { useAgentContextStore } from '@renderer/shared/stores/agent-context-store';

export const workspaceKeys = {
  all: ['workspace'] as const,
  sessions: (projectId: string) => ['workspace', 'sessions', projectId] as const,
  relaySessions: (projectId: string) => ['workspace', 'relay-sessions', projectId] as const,
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
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      ipc(WORKSPACE.SEND.MESSAGE, { sessionId, message }),
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

// ── Relay Session Hooks ────────────────────────────────────────

/**
 * Spawn a remote session via the hub relay.
 * Registers the new session in the agent context store on success.
 */
export function useSpawnRemoteSession(projectId: string) {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  const upsertSession = useAgentContextStore((s) => s.upsertSession);

  return useMutation({
    mutationFn: ({
      agentRole,
      prompt,
      workDir,
      taskId,
    }: {
      agentRole: string;
      prompt: string;
      workDir: string;
      taskId?: string;
    }) =>
      ipc(RELAY.SPAWN.SESSION, { projectId, agentRole, prompt, workDir, taskId }),
    onSuccess: (data, variables) => {
      upsertSession({
        sessionId: data.sessionId,
        projectId,
        source: 'relay',
        status: 'active',
        agentRole: variables.agentRole,
        startedAt: new Date().toISOString(),
        endedAt: null,
      });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.relaySessions(projectId),
      });
    },
    onError: onError('spawn remote session'),
  });
}

/**
 * Send input to an active relay session.
 */
export function useSendRelayInput() {
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: string }) =>
      ipc(RELAY.SEND.INPUT, { sessionId, data }),
    onError: onError('send relay input'),
  });
}

/**
 * List relay sessions for a project.
 */
export function useRelaySessions(projectId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.relaySessions(projectId ?? ''),
    queryFn: () => ipc(RELAY.LIST.SESSIONS, { projectId: projectId ?? '' }),
    enabled: projectId !== null,
  });
}

/**
 * Get the output buffer for a relay session.
 */
export function useRelayBuffer(sessionId: string | null) {
  return useQuery({
    queryKey: ['workspace', 'relay-buffer', sessionId ?? ''],
    queryFn: () => ipc(RELAY.GET.BUFFER, { sessionId: sessionId ?? '' }),
    enabled: sessionId !== null,
  });
}
