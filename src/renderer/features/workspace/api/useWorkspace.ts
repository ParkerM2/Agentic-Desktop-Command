/**
 * Workspace React Query Hooks
 *
 * useWorkspaceSessions — polls workspace.getSessions, invalidates on IPC events.
 * useWorkspaceInit    — calls workspace.initProject when a project tab opens.
 * useWorkspaceSend    — mutation to send a message to a session.
 * useSpawnTeamLead    — mutation to spawn an additional Team Lead.
 * useStopTeamLead     — mutation to stop a mortal Team Lead.
 *
 * Message streaming for each session reuses useAgentStream from agent-dashboard.
 */

import { useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

export const workspaceKeys = {
  all: ['workspace'] as const,
  sessions: (projectId: string) => ['workspace', 'sessions', projectId] as const,
};

/** Poll active sessions for a project. Invalidates on session lifecycle events. */
export function useWorkspaceSessions(projectId: string | null) {
  const queryClient = useQueryClient();

  useIpcEvent('event:workspace.sessionReady', () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent('event:workspace.sessionCrashed', () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent('event:workspace.sessionRestarted', () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });

  return useQuery({
    queryKey: workspaceKeys.sessions(projectId ?? ''),
    queryFn: () => ipc('workspace.getSessions', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    refetchInterval: 5000,
  });
}

/** Call initProject when a project tab first opens. Idempotent on the backend. */
export function useWorkspaceInit(projectId: string | null, projectPath: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !projectPath) return;

    void (async () => {
      await ipc('workspace.initProject', { projectId, projectPath });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    })();
  }, [projectId, projectPath, queryClient]);
}

/** Send a message to a workspace session. */
export function useWorkspaceSend() {
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      ipc('workspace.sendMessage', { sessionId, message }),
  });
}

/** Spawn an additional mortal Team Lead. */
export function useSpawnTeamLead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planPath }: { planPath?: string }) =>
      ipc('workspace.spawnTeamLead', { projectId, planPath }),
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
      ipc('workspace.stopTeamLead', { projectId, index }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}
