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
  const { onError: toastError } = useMutationErrorToast();

  const capturesKey = dashboardKeys.captures();

  const createCapture = useMutation({
    mutationFn: (text: string) => {
      const id = crypto.randomUUID();
      return ipc(DASHBOARD.CREATE.CAPTURE, { id, text });
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: capturesKey });
    },
    onError(err) {
      toastError('create capture')(err);
    },
  });

  const deleteCapture = useMutation({
    mutationFn: (id: string) => ipc(DASHBOARD.DELETE.CAPTURE, { id }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: capturesKey });
    },
    onError(err) {
      toastError('delete capture')(err);
    },
  });

  return { createCapture, deleteCapture };
}

/** Update an existing capture's text */
export function useUpdateCapture() {
  const queryClient = useQueryClient();
  const { onError: toastError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (data: { id: string; text: string }) =>
      ipc(DASHBOARD.UPDATE.CAPTURE, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.captures() });
    },
    onError(err) {
      toastError('update capture')(err);
    },
  });
}
