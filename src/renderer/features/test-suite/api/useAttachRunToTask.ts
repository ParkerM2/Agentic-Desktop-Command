/**
 * useAttachRunToTask — Mutation hook for attaching a test run to a task
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useAttachRunToTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { runId: string; taskId: string }) =>
      ipc(TEST_SUITE.TASK['ATTACH-RUN'], input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.all });
    },
  });
}
