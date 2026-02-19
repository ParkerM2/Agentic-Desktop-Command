/**
 * React Query hooks for quick capture persistence
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

import { dashboardKeys } from './queryKeys';

/** Fetch all persisted captures */
export function useCaptures() {
  return useQuery({
    queryKey: dashboardKeys.captures(),
    queryFn: () => ipc('dashboard.captures.list', {}),
    staleTime: 30_000,
  });
}

/** Mutations for creating and deleting captures */
export function useCaptureMutations() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  const createCapture = useMutation({
    mutationFn: (text: string) => ipc('dashboard.captures.create', { text }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.captures() });
    },
    onError: onError('create capture'),
  });

  const deleteCapture = useMutation({
    mutationFn: (id: string) => ipc('dashboard.captures.delete', { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.captures() });
    },
    onError: onError('delete capture'),
  });

  return { createCapture, deleteCapture };
}
