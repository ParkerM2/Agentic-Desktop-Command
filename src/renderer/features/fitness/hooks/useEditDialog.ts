/**
 * useEditDialog — shared save-with-close pattern for fitness edit dialogs.
 *
 * Wraps a TanStack mutation with validation gating and auto-close on success.
 * Used by WorkoutEditDialog, MeasurementEditDialog, and GoalEditDialog.
 */

import type { UseMutationResult } from '@tanstack/react-query';

interface UseEditDialogOptions<TInput, TOutput> {
  /** The TanStack mutation to call on save */
  mutation: UseMutationResult<TOutput, Error, TInput>;
  /** Build the mutation input from current form state; return null if invalid */
  buildInput: () => TInput | null;
  /** Close callback (typically `onOpenChange(false)`) */
  onClose: () => void;
}

interface UseEditDialogReturn {
  /** Whether the save button should be disabled */
  isSaveDisabled: boolean;
  /** Call to validate, mutate, and close on success */
  handleSave: () => void;
}

export function useEditDialog<TInput, TOutput>({
  mutation,
  buildInput,
  onClose,
}: UseEditDialogOptions<TInput, TOutput>): UseEditDialogReturn {
  const input = buildInput();
  const isSaveDisabled = input === null || mutation.isPending;

  function handleSave(): void {
    const payload = buildInput();
    if (payload === null) return;

    mutation.mutate(payload, {
      onSuccess: () => {
        onClose();
      },
    });
  }

  return { isSaveDisabled, handleSave };
}
