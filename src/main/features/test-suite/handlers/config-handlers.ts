/**
 * Config IPC Handlers
 *
 * Registers the 5 CONFIG channel handlers (GET, LIST, SAVE, DELETE, SET-ACTIVE).
 * SET-ACTIVE emits TEST_SUITE_EVENTS.CONFIG.CHANGED when the active config changes.
 */

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerConfigHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  const { configStore } = testSuiteService;

  router.handle(TEST_SUITE.CONFIG.GET, ({ projectId }) =>
    Promise.resolve(configStore.getActive(projectId)),
  );

  router.handle(TEST_SUITE.CONFIG.LIST, ({ projectId }) =>
    Promise.resolve(configStore.list(projectId)),
  );

  router.handle(TEST_SUITE.CONFIG.SAVE, ({ projectId, config }) =>
    Promise.resolve(configStore.save(projectId, config)),
  );

  router.handle(TEST_SUITE.CONFIG.DELETE, ({ projectId, configId }) => {
    configStore.delete(projectId, configId);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.CONFIG['SET-ACTIVE'], ({ projectId, configId }) => {
    configStore.setActive(projectId, configId);
    const active = configStore.getActive(projectId);
    if (active) {
      router.emit(TEST_SUITE_EVENTS.CONFIG.CHANGED, { config: active });
    }
    return Promise.resolve({ success: true });
  });
}
