/**
 * React Query hooks for QA run queries and mutations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

/** Fetch all runs, optionally filtered by scriptId */
export function useRuns(scriptId?: string | null) {
  const id = scriptId ?? undefined;
  return useQuery({
    queryKey: id ? testSuiteKeys.runs(id) : testSuiteKeys.allRuns('all'),
    queryFn: () => ipc(TEST_SUITE.LIST.RUNS, { scriptId: id }),
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
      baseUrlOverride,
    }: {
      scriptId: string;
      triggeredBy?: 'manual' | 'scheduled' | 'ci';
      baseUrlOverride?: string;
    }) => ipc(TEST_SUITE.RUN.SCRIPT, { scriptId, triggeredBy, baseUrlOverride }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.all });
    },
    onError: onError('run QA script'),
  });
}

/** Run multiple QA scripts sequentially as a batch */
export function useBatchRun() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      scriptIds: string[];
      triggeredBy?: 'manual' | 'scheduled' | 'ci';
      baseUrlOverride?: string;
    }) => ipc(TEST_SUITE.BATCH.RUN, {
      scriptIds: input.scriptIds,
      triggeredBy: input.triggeredBy ?? 'manual',
      baseUrlOverride: input.baseUrlOverride,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.all });
    },
    onError: onError('batch run scripts'),
  });
}
