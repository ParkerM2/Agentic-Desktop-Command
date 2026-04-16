import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useDeleteTestSuiteConfig(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configId: string) =>
      ipc(TEST_SUITE.CONFIG.DELETE, { projectId, configId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.all });
    },
  });
}
