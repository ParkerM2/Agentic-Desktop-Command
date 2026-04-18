/**
 * Watch Mode IPC Handlers
 *
 * Registers WATCH.START, WATCH.STOP, WATCH.LIST handlers.
 */

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerWatchHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE.WATCH.START, async ({ scriptId }) => {
    const script = await testSuiteService.getScript(scriptId);
    if (!script?.filePath) return { success: false };

    testSuiteService.fileWatcher.watch(scriptId, script.filePath, () => {
      void testSuiteService
        .runScript({ scriptId, triggeredBy: 'auto-trigger' })
        .then(({ runId }) => {
          router.emit(TEST_SUITE_EVENTS.WATCH.TRIGGERED, {
            scriptId,
            runId,
            timestamp: new Date().toISOString(),
          });
          return null;
        })
        .catch(() => {
          // Swallow — the watcher callback must not throw.
        });
    });

    return { success: true };
  });

  router.handle(TEST_SUITE.WATCH.STOP, ({ scriptId }) => {
    testSuiteService.fileWatcher.unwatch(scriptId);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.WATCH.LIST, () =>
    Promise.resolve(testSuiteService.fileWatcher.listWatched()),
  );
}
