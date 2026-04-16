import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useSaveTestSuiteConfig(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: TestSuiteConfig) => ipc(TEST_SUITE.CONFIG.SAVE, { projectId, config }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.all });
    },
  });
}
