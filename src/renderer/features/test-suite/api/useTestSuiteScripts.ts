import { useQuery } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useTestSuiteScripts(projectId: string | null | undefined) {
  return useQuery({
    queryKey: testSuiteKeys.scripts(projectId ?? ''),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by `enabled`
    queryFn: () => ipc(TEST_SUITE.LIST.SCRIPTS, { projectId: projectId! }),
    enabled: typeof projectId === 'string' && projectId.length > 0,
    staleTime: 30_000,
  });
}
