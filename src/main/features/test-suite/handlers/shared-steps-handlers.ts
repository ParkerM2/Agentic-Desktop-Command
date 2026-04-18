/**
 * Shared Step Groups IPC Handlers
 *
 * Registers SHARED-STEPS.LIST/GET/CREATE/UPDATE/DELETE/DOMAINS handlers.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerSharedStepsHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  const { sharedStepsStore } = testSuiteService;

  router.handle(TEST_SUITE['SHARED-STEPS'].LIST, ({ projectId }) =>
    Promise.resolve(sharedStepsStore.list(projectId)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].GET, ({ id }) =>
    Promise.resolve(sharedStepsStore.get(id)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].CREATE, (input) =>
    Promise.resolve(sharedStepsStore.create(input)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].UPDATE, ({ id, ...params }) =>
    Promise.resolve(sharedStepsStore.update(id, params)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].DELETE, ({ id }) => {
    sharedStepsStore.delete(id);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE['SHARED-STEPS'].DOMAINS, ({ projectId }) =>
    Promise.resolve(sharedStepsStore.domains(projectId)),
  );
}
