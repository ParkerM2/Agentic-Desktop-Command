/**
 * Agent dashboard mutation hooks
 *
 * React Query mutations for spawning, messaging, and stopping agent sessions.
 * All mutations invalidate relevant query keys on success so the UI stays
 * consistent even before push events arrive.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD } from '@shared/ipc/agent-dashboard/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { agentDashboardKeys } from './queryKeys';

/** Spawn a headless stream-json Project Owner session */
export function useSpawnProjectOwner() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      projectPath: string;
      prompt: string;
      model?: string;
      name?: string;
    }) => ipc(AGENT_DASHBOARD.SPAWN['PROJECT-OWNER'], input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentDashboardKeys.sessions() });
    },
    onError: onError('spawn project owner'),
  });
}

/** Spawn a tmux-based Team Lead session with Agent Teams enabled */
export function useSpawnTeamLead() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      projectPath: string;
      teamName: string;
      prompt: string;
      model?: string;
      name?: string;
    }) => ipc(AGENT_DASHBOARD.SPAWN['TEAM-LEAD'], input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentDashboardKeys.sessions() });
    },
    onError: onError('spawn team lead'),
  });
}

/** Send a message to an active agent session */
export function useSendMessage() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: { sessionId: string; message: string }) =>
      ipc(AGENT_DASHBOARD.SEND.MESSAGE, input),
    onError: onError('send message'),
  });
}

/** Stop an active agent session gracefully */
export function useStopSession() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: { sessionId: string }) => ipc(AGENT_DASHBOARD.STOP.SESSION, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentDashboardKeys.sessions() });
    },
    onError: onError('stop session'),
  });
}
