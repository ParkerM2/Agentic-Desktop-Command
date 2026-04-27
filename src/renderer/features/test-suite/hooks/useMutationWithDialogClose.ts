import { useCallback } from 'react';

import type { UseMutationResult } from '@tanstack/react-query';

export function useMutationWithDialogClose<TData, TPayload>(
  mutation: UseMutationResult<TData, Error, TPayload>,
  onClose: () => void,
  resetState?: () => void,
) {
  const handleMutate = useCallback(
    (payload: TPayload) => {
      mutation.mutate(payload, {
        onSuccess: () => {
          resetState?.();
          onClose();
        },
      });
    },
    [mutation, onClose, resetState],
  );

  return { handleMutate, isPending: mutation.isPending };
}
