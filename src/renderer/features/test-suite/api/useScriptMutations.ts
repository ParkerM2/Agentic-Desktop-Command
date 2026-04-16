/**
 * React Query mutation hooks for QA script operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';


import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './queryKeys';

import type { z } from 'zod';

export type TestSuiteStep = z.infer<typeof TestSuiteStepSchema>;

/** Save (create or update) a QA script */
export function useSaveScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: {
      id?: string;
      projectId: string;
      name: string;
      description?: string;
      steps: TestSuiteStep[];
    }) => ipc(TEST_SUITE.SAVE.SCRIPT, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.scripts() });
    },
    onError: onError('save QA script'),
  });
}

/** Delete a QA script */
export function useDeleteScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => ipc(TEST_SUITE.DELETE.SCRIPT, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.scripts() });
    },
    onError: onError('delete QA script'),
  });
}

/** Export a run to file */
export function useExportRun() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ runId, format }: { runId: string; format: 'json' | 'html' | 'csv' }) =>
      ipc(TEST_SUITE.EXPORT.FILE, { runId, format }),
    onError: onError('export run'),
  });
}
