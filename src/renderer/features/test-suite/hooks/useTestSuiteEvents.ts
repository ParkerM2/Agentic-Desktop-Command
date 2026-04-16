import { useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { testSuiteKeys } from '../api/testSuiteKeys';

export function useTestSuiteEvents(projectId: string) {
  const queryClient = useQueryClient();

  useIpcEvent(TEST_SUITE_EVENTS.CONFIG.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.config(projectId) });
  });

  useIpcEvent(TEST_SUITE_EVENTS.RUN.COMPLETED, () => {
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.all });
  });
}
