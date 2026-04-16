import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

const baselineKeys = {
  list: (scriptId: string) => ['test-suite', 'baselines', scriptId] as const,
  diffs: (runId: string) => ['test-suite', 'diffs', runId] as const,
};

export function useBaselines(scriptId: string | undefined) {
  return useQuery({
    queryKey: baselineKeys.list(scriptId ?? ''),
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
      void qc.invalidateQueries({ queryKey: baselineKeys.list(variables.scriptId) });
    },
  });
}

export function useDeleteBaselines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) => ipc(TEST_SUITE.BASELINE.DELETE, { scriptId }),
    onSuccess: (_data, scriptId) => {
      void qc.invalidateQueries({ queryKey: baselineKeys.list(scriptId) });
    },
  });
}

export function useRunDiffs(runId: string | undefined) {
  return useQuery({
    queryKey: baselineKeys.diffs(runId ?? ''),
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
      void qc.invalidateQueries({ queryKey: baselineKeys.diffs(variables.runId) });
    },
  });
}
