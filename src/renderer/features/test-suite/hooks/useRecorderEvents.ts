/**
 * useRecorderEvents — Subscribe to Test Suite IPC events
 *
 * Bridges real-time recording/run output events from main process
 * to React Query cache and local store state.
 */

import { useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useToastStore } from '@renderer/shared/stores';

import { testSuiteKeys } from '../api/queryKeys';
import { useTestSuiteStore } from '../store';

export function useRecorderEvents() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const appendOutputLine = useTestSuiteStore((s) => s.appendOutputLine);
  const setActiveRunId = useTestSuiteStore((s) => s.setActiveRunId);
  const setRunning = useTestSuiteStore((s) => s.setRunning);

  // Streaming output line → append to local store
  useIpcEvent(TEST_SUITE_EVENTS.OUTPUT.LINE, (data) => {
    appendOutputLine(data.line);
  });

  // Screenshot captured during run → invalidate run cache
  useIpcEvent(TEST_SUITE_EVENTS.RUN.SCREENSHOT, (data) => {
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.run(data.runId) });
  });

  // Run complete → update state, invalidate caches, show toast
  useIpcEvent(TEST_SUITE_EVENTS.RUN.COMPLETED, (data) => {
    setRunning(false);
    setActiveRunId(data.runId);
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.run(data.runId) });
    void queryClient.invalidateQueries({ queryKey: testSuiteKeys.runs() });

    const isPassing = data.status === 'passed';
    addToast(
      `QA run ${isPassing ? 'passed' : 'failed'} (${data.report.passedSteps}/${data.report.totalSteps} steps)`,
      isPassing ? 'success' : 'error',
    );
  });
}
