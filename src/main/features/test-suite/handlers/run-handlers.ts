/**
 * Run IPC Handlers
 *
 * Registers the run channel handlers: RUN.SCRIPT, GET.RUN, LIST.RUNS,
 * TASK.ATTACH-RUN, BATCH.RUN, and OPEN.REPORT. RUN.SCRIPT emits
 * TEST_SUITE_EVENTS.RUN.STARTED after the run is initiated.
 */

import { shell } from 'electron';

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerRunHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE.RUN.SCRIPT, async (input) => {
    const result = await testSuiteService.runScript(input);
    router.emit(TEST_SUITE_EVENTS.RUN.STARTED, {
      runId: result.runId,
      scriptId: input.scriptId,
      timestamp: new Date().toISOString(),
    });
    return result;
  });

  router.handle(TEST_SUITE.GET.RUN, ({ runId }) =>
    testSuiteService.getRun(runId),
  );

  router.handle(TEST_SUITE.LIST.RUNS, (input) =>
    testSuiteService.listRuns(input),
  );

  router.handle(TEST_SUITE.TASK['ATTACH-RUN'], ({ runId, taskId }) =>
    testSuiteService.attachRunToTask(runId, taskId),
  );

  router.handle(TEST_SUITE.BATCH.RUN, (input) =>
    testSuiteService.batchRun(input),
  );

  router.handle(TEST_SUITE.OPEN.REPORT, async ({ reportPath }) => {
    await shell.openPath(reportPath);
    return { success: true };
  });
}
