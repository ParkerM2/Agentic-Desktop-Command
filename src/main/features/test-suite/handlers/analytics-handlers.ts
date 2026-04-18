/**
 * Analytics IPC Handlers
 *
 * Registers the 7 analytics channel handlers. All delegate to
 * testSuiteService.analytics — no logic here.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerAnalyticsHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  const { analytics } = testSuiteService;

  router.handle(TEST_SUITE.ANALYTICS.SUMMARY, ({ projectId }) =>
    Promise.resolve(analytics.summary(projectId)),
  );

  router.handle(TEST_SUITE.ANALYTICS.TREND, ({ projectId, days }) =>
    Promise.resolve(analytics.trend(projectId, days)),
  );

  router.handle(TEST_SUITE.ANALYTICS['TOP-FAILURES'], ({ projectId, limit }) =>
    Promise.resolve(analytics.topFailures(projectId, limit)),
  );

  router.handle(TEST_SUITE.ANALYTICS.SLOWEST, ({ projectId, limit }) =>
    Promise.resolve(analytics.slowestTests(projectId, limit)),
  );

  router.handle(TEST_SUITE.ANALYTICS['ERROR-PATTERNS'], ({ projectId, limit }) =>
    Promise.resolve(analytics.errorPatterns(projectId, limit)),
  );

  router.handle(TEST_SUITE.ANALYTICS.FLAKY, ({ projectId }) =>
    Promise.resolve(analytics.flakyTests(projectId)),
  );

  router.handle(TEST_SUITE.ANALYTICS['RUN-HISTORY'], ({ scriptId, limit }) =>
    Promise.resolve(analytics.runHistory(scriptId, limit)),
  );
}
