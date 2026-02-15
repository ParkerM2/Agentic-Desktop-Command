/**
 * React Query hooks for workspace operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { workspaceKeys } from './queryKeys';

/** Fetch all workspaces */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => ipc('workspaces.list', {}),
    staleTime: 60_000,
  });
}

/** Create a new workspace */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvokeInput<'workspaces.create'>) =>
      ipc('workspaces.create', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

/** Update an existing workspace */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvokeInput<'workspaces.update'>) =>
      ipc('workspaces.update', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

/** Delete a workspace */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc('workspaces.delete', { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}
