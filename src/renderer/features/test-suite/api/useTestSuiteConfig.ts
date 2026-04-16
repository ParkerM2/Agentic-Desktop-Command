import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useTestSuiteConfig(projectId: string | null | undefined) {
  const normalizedProjectId = typeof projectId === 'string' ? projectId : '';
  return useQuery({
    queryKey: testSuiteKeys.config(normalizedProjectId),
    queryFn: () => ipc(TEST_SUITE.CONFIG.GET, { projectId: normalizedProjectId }),
    enabled: normalizedProjectId.length > 0,
    staleTime: 30_000,
  });
}
