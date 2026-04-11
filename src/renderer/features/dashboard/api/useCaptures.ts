/**
 * React Query hooks for quick capture persistence
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DASHBOARD } from '@shared/ipc/dashboard/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';
import { optimisticCreate, optimisticDelete } from '@renderer/shared/lib/optimistic';

import { dashboardKeys } from './queryKeys';

interface Capture {
  id: string;
  text: string;
  createdAt: string;
}

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
  const createOpts = optimisticCreate<string, Capture>(queryClient, capturesKey, (text) => ({
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  }));
  const deleteOpts = optimisticDelete<Capture>(queryClient, capturesKey);

  const createCapture = useMutation({
    mutationFn: (text: string) => {
      const id = crypto.randomUUID();
      return ipc(DASHBOARD.CREATE.CAPTURE, { id, text });
    },
    onMutate: (input) => createOpts.onMutate(input),
    onError(err, input, context) {
      createOpts.onError(err, input, context);
      toastError('create capture')(err);
    },
    onSettled: () => createOpts.onSettled(),
  });

  const deleteCapture = useMutation({
    mutationFn: (id: string) => ipc(DASHBOARD.DELETE.CAPTURE, { id }),
    onMutate: (id) => deleteOpts.onMutate(id),
    onError(err, id, context) {
      deleteOpts.onError(err, id, context);
      toastError('delete capture')(err);
    },
    onSettled: () => deleteOpts.onSettled(),
  });

  return { createCapture, deleteCapture };
}
