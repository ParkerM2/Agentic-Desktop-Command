/**
 * useDialogWithMutation — shared pattern for dialog submit: mutate → reset → close.
 *
 * Covers the common case where a dialog form calls mutation.mutate(payload),
 * then on success resets the form and closes the dialog.
 */

import { useCallback } from 'react';

import type { UseMutationResult } from '@tanstack/react-query';

export function useDialogWithMutation<TPayload, TError = unknown>(
  mutation: UseMutationResult<unknown, TError, TPayload>,
  options: { onClose: () => void; resetForm?: () => void },
) {
  const handleSubmit = useCallback(
    (payload: TPayload) => {
      mutation.mutate(payload, {
        onSuccess: () => {
          options.resetForm?.();
          options.onClose();
        },
      });
    },
    [mutation, options],
  );

  return {
    handleSubmit,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
