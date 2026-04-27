import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useBaselines(scriptId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.baselines(scriptId ?? ''),
    queryFn: () => ipc(TEST_SUITE.BASELINE.LIST, { scriptId: scriptId ?? '' }),
    enabled: !!scriptId,
    staleTime: 30_000,
  });
}

export function useSetBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scriptId: string; screenshotId: string }) =>
      ipc(TEST_SUITE.BASELINE.SET, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.baselines(variables.scriptId) });
    },
  });
}

export function useDeleteBaselines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) => ipc(TEST_SUITE.BASELINE.DELETE, { scriptId }),
    onSuccess: (_data, scriptId) => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.baselines(scriptId) });
    },
  });
}

export function useRunDiffs(runId: string | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.diffs(runId ?? ''),
    queryFn: () => ipc(TEST_SUITE.DIFF.LIST, { runId: runId ?? '' }),
    enabled: !!runId,
    staleTime: 10_000,
  });
}

export function useCompareDiffs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { runId: string; sensitivity?: 'strict' | 'balanced' | 'relaxed' }) =>
      ipc(TEST_SUITE.DIFF.COMPARE, {
        runId: input.runId,
        sensitivity: input.sensitivity ?? 'balanced',
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.diffs(variables.runId) });
    },
  });
}
