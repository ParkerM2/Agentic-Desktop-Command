/**
 * Auth IPC Handlers
 *
 * Registers the 2 AUTH channel handlers (SAVE, CLEAR).
 * Both delegate directly to testSuiteService — no logic here.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerAuthHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE.AUTH.SAVE, ({ projectId }) =>
    testSuiteService.saveAuthState(projectId),
  );

  router.handle(TEST_SUITE.AUTH.CLEAR, ({ projectId }) =>
    testSuiteService.clearAuthState(projectId),
  );
}
