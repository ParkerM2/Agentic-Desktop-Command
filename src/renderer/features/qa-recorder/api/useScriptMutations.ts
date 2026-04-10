/**
 * React Query mutation hooks for QA script operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QA_RECORDER } from '@shared/ipc/qa-recorder/channels';
import type { QaRecorderStepSchema } from '@shared/ipc/qa-recorder/schemas';


import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { qaRecorderKeys } from './queryKeys';

import type { z } from 'zod';

export type QaRecorderStep = z.infer<typeof QaRecorderStepSchema>;

/** Save (create or update) a QA script */
export function useSaveScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: {
      id?: string;
      name: string;
      description?: string;
      steps: QaRecorderStep[];
    }) => ipc(QA_RECORDER.SAVE.SCRIPT, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qaRecorderKeys.scripts() });
    },
    onError: onError('save QA script'),
  });
}

/** Delete a QA script */
export function useDeleteScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => ipc(QA_RECORDER.DELETE.SCRIPT, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qaRecorderKeys.scripts() });
    },
    onError: onError('delete QA script'),
  });
}

/** Export a run to file */
export function useExportRun() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ runId, format }: { runId: string; format: 'json' | 'html' | 'csv' }) =>
      ipc(QA_RECORDER.EXPORT.FILE, { runId, format }),
    onError: onError('export run'),
  });
}
