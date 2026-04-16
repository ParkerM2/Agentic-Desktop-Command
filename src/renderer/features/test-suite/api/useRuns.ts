/**
 * React Query hooks for QA run queries and mutations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { QaRunSchema } from '@shared/ipc/test-suite/schemas';


import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './queryKeys';

import type { z } from 'zod';

export type QaRun = z.infer<typeof QaRunSchema>;

/** Fetch all runs, optionally filtered by scriptId */
export function useRuns(scriptId?: string) {
  return useQuery({
    queryKey: scriptId ? testSuiteKeys.runsByScript(scriptId) : testSuiteKeys.runs(),
    queryFn: () => ipc(TEST_SUITE.LIST.RUNS, { scriptId }),
    staleTime: 10_000,
  });
}

/** Fetch a single run by id */
export function useRun(runId: string | null) {
  return useQuery({
    queryKey: testSuiteKeys.run(runId ?? ''),
    queryFn: () => ipc(TEST_SUITE.GET.RUN, { runId: runId ?? '' }),
    enabled: runId !== null && runId.length > 0,
    staleTime: 5_000,
  });
}

/** Run a QA script */
export function useRunScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({
      scriptId,
      triggeredBy = 'manual',
    }: {
      scriptId: string;
      triggeredBy?: 'manual' | 'scheduled' | 'ci';
    }) => ipc(TEST_SUITE.RUN.SCRIPT, { scriptId, triggeredBy }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.runs() });
    },
    onError: onError('run QA script'),
  });
}
