/**
 * Schedule IPC Handlers
 *
 * Registers SCHEDULE.LIST/GET/CREATE/UPDATE/DELETE/TRIGGER-NOW handlers.
 */

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerScheduleHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  const { scheduler } = testSuiteService;

  router.handle(TEST_SUITE.SCHEDULE.LIST, ({ projectId }) =>
    Promise.resolve(scheduler.list(projectId)),
  );

  router.handle(TEST_SUITE.SCHEDULE.GET, ({ id }) =>
    Promise.resolve(scheduler.get(id)),
  );

  router.handle(TEST_SUITE.SCHEDULE.CREATE, (input) =>
    Promise.resolve(scheduler.create(input)),
  );

  router.handle(TEST_SUITE.SCHEDULE.UPDATE, ({ id, ...params }) =>
    Promise.resolve(scheduler.update(id, params)),
  );

  router.handle(TEST_SUITE.SCHEDULE.DELETE, ({ id }) => {
    scheduler.delete(id);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.SCHEDULE['TRIGGER-NOW'], async ({ id }) => {
    const schedule = scheduler.get(id);
    if (!schedule) throw new Error(`Schedule not found: ${id}`);
    const result = await testSuiteService.runScript({
      scriptId: schedule.scriptId,
      triggeredBy: 'scheduled',
    });
    router.emit(TEST_SUITE_EVENTS.RUN.STARTED, {
      runId: result.runId,
      scriptId: schedule.scriptId,
      timestamp: new Date().toISOString(),
    });
    return result;
  });
}
