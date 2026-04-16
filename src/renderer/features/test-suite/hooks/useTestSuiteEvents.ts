import { useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { testSuiteKeys } from '../api/testSuiteKeys';

export function useTestSuiteEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(TEST_SUITE_EVENTS.CONFIG.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.configs() });
  });

  useIpcEvent(TEST_SUITE_EVENTS.RUN.COMPLETED, (data) => {
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.runs() });
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.run(data.runId) });
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.screenshotsByRun(data.runId) });
  });
}
