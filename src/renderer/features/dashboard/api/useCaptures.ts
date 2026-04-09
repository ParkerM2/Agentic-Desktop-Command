/**
 * React Query hooks for quick capture persistence
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DASHBOARD } from '@shared/ipc/dashboard/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

import { dashboardKeys } from './queryKeys';

/** Fetch all persisted captures */
export function useCaptures() {
  return useQuery({
    queryKey: dashboardKeys.captures(),
    queryFn: () => ipc(DASHBOARD.LIST.CAPTURES, {}),
    staleTime: 30_000,
  });
}

/** Mutations for creating and deleting captures */
export function useCaptureMutations() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  const createCapture = useMutation({
    mutationFn: (text: string) => ipc(DASHBOARD.CREATE.CAPTURE, { text }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.captures() });
    },
    onError: onError('create capture'),
  });

  const deleteCapture = useMutation({
    mutationFn: (id: string) => ipc(DASHBOARD.DELETE.CAPTURE, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.captures() });
    },
    onError: onError('delete capture'),
  });

  return { createCapture, deleteCapture };
}
