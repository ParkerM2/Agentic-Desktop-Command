import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useTestSuiteScreenshots(runId: string | null | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.screenshots(runId ?? ''),
    queryFn: () => ipc(TEST_SUITE.SCREENSHOT.LIST, { runId: runId ?? undefined }),
    enabled: typeof runId === 'string' && runId.length > 0,
    staleTime: 10_000,
  });
}
