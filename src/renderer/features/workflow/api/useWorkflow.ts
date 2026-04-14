/**
 * React Query hooks for workflow operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BUS } from '@shared/ipc/bus/channels';
import { WORKFLOW } from '@shared/ipc/workflow/channels';
import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { busKeys } from '../../bus/api/queryKeys';

import { workflowKeys } from './queryKeys';

/** Start watching progress files in a project */
export function useStartProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.WATCH.PROGRESS>) =>
      ipc(WORKFLOW.WATCH.PROGRESS, data),
  });
}

/** Stop watching progress files */
export function useStopProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.STOP.WATCHING>) =>
      ipc(WORKFLOW.STOP.WATCHING, data),
  });
}

/** Launch a task execution via command bus */
export function useLaunchTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type: 'team-lead' | 'project-owner' | 'assistant' | 'qa' | 'research' | 'planner';
      phase?: 'research' | 'planning' | 'executing' | 'qa';
      projectPath?: string;
      prompt: string;
      taskSlug?: string;
    }) => ipc(BUS.SPAWN.SESSION, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
  });
}

/** Check if a session is running — polls bus sessions every 5s */
export function useSessionStatus(taskSlug: string) {
  return useQuery({
    queryKey: workflowKeys.session(taskSlug),
    queryFn: async () => {
      const sessions = await ipc(BUS.LIST.SESSIONS, { taskSlug });
      const running = sessions.some((s) => s.status === 'active');
      return { running };
    },
    enabled: taskSlug.length > 0,
    refetchInterval: 5_000,
  });
}

/** Stop a running session */
export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessionId: string }) =>
      ipc(BUS.KILL.SESSION, { sessionId: data.sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
  });
}
