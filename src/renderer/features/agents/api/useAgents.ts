/**
 * React Query hooks for agent operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from '@features/tasks';

import { agentKeys } from './queryKeys';

/** Fetch all agents across all projects */
export function useAllAgents() {
  return useQuery({
    queryKey: agentKeys.all,
    queryFn: () => ipc('agents.listAll', {}),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

/** Fetch agents for a project */
export function useAgents(projectId: string | null) {
  return useQuery({
    queryKey: agentKeys.list(projectId ?? ''),
    queryFn: () => ipc('agents.list', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    staleTime: 5_000, // Agents change frequently
    refetchInterval: 10_000, // Poll for status
  });
}

/** Stop an agent */
export function useStopAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => ipc('agents.stop', { agentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** Pause an agent */
export function usePauseAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => ipc('agents.pause', { agentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}

/** Resume a paused agent */
export function useResumeAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => ipc('agents.resume', { agentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}
