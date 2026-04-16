import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { InvokeInput } from '@shared/ipc';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

type SaveScriptInput = InvokeInput<typeof TEST_SUITE.SAVE.SCRIPT>;

export function useSaveScript(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveScriptInput) => ipc(TEST_SUITE.SAVE.SCRIPT, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.scripts(projectId) });
    },
  });
}
