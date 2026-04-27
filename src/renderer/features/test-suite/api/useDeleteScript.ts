import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

export function useDeleteScript(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(TEST_SUITE.DELETE.SCRIPT, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.scripts(projectId) });
    },
  });
}
