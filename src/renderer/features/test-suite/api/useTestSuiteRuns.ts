import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useTestSuiteRuns(scriptId: string | null | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.runsByScript(scriptId ?? ''),
    queryFn: () => ipc(TEST_SUITE.LIST.RUNS, { scriptId: scriptId ?? undefined }),
    enabled: typeof scriptId === 'string' && scriptId.length > 0,
    staleTime: 10_000,
  });
}
