/**
 * Browser-View IPC Handlers
 *
 * Registers the recorder step forwarder and the 7 BROWSER-VIEW channel
 * handlers (CREATE, NAVIGATE, BACK, FORWARD, RELOAD, SET-BOUNDS, DESTROY).
 * Preload emits steps in contract-normalized shape; we validate, wrap with
 * stepIndex + timestamp, and forward to the renderer.
 */

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';
import { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

type TestSuiteStep = (typeof TestSuiteStepSchema)['_output'];

const recorderEmittableTypes = new Set(['navigate', 'click', 'fill', 'select', 'press']);

function normalizeStep(raw: unknown): TestSuiteStep | null {
  const parsed = TestSuiteStepSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (!recorderEmittableTypes.has(parsed.data.type)) return null;
  return parsed.data;
}

export function registerBrowserViewHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  const { browserViewManager: bvm } = testSuiteService;

  let recorderStepIndex = 0;

  bvm.setStepEmitter((raw) => {
    const step = normalizeStep(raw);
    if (!step) return;
    router.emit(TEST_SUITE_EVENTS.RECORDER.STEP, {
      stepIndex: recorderStepIndex++,
      step,
      timestamp: new Date().toISOString(),
    });
  });

  router.handle(TEST_SUITE['BROWSER-VIEW'].CREATE, ({ url, bounds }) =>
    Promise.resolve(bvm.create(url, bounds)),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].NAVIGATE, ({ url }) =>
    Promise.resolve(bvm.navigate(url)),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].BACK, () =>
    Promise.resolve(bvm.back()),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].FORWARD, () =>
    Promise.resolve(bvm.forward()),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].RELOAD, () =>
    Promise.resolve(bvm.reload()),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW']['SET-BOUNDS'], (bounds) =>
    Promise.resolve(bvm.setBounds(bounds)),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].DESTROY, () =>
    Promise.resolve(bvm.destroy()),
  );
}
