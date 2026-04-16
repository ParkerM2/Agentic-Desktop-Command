import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useTestSuiteConfigs(projectId: string) {
  return useQuery({
    queryKey: [...testSuiteKeys.all, 'configs', projectId] as const,
    queryFn: () => ipc(TEST_SUITE.CONFIG.LIST, { projectId }),
    enabled: projectId.length > 0,
    staleTime: 30_000,
  });
}
