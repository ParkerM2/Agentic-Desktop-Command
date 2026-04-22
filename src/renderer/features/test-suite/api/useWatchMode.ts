import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useWatchedScripts() {
  return useQuery({
    queryKey: testSuiteKeys.watchList,
    queryFn: () => ipc(TEST_SUITE.WATCH.LIST, {}),
    staleTime: 5_000,
  });
}

export function useStartWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) => ipc(TEST_SUITE.WATCH.START, { scriptId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.watchList });
    },
  });
}

export function useStopWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) => ipc(TEST_SUITE.WATCH.STOP, { scriptId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: testSuiteKeys.watchList });
    },
  });
}
