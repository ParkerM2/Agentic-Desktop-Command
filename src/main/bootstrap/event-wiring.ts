/**
 * Event Wiring — forwards service events to the renderer via IPC.
 *
 * Handles:
 * - Watch evaluator → proactive assistant notifications
 */

import { ASSISTANT_EVENTS } from '@shared/ipc/assistant/channels';

import type { createWatchEvaluator } from '../features/assistant/watch-evaluator';
import type { IpcRouter } from '../ipc/router';

interface EventWiringDeps {
  router: IpcRouter;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
}

/** Wires all service events to IPC for renderer consumption. */
export function wireEventForwarding(deps: EventWiringDeps): void {
  const {
    router,
    watchEvaluator,
  } = deps;

  // ─── Watch evaluator → assistant response notifications ─────
  watchEvaluator.onTrigger((watch) => {
    const description = watch.followUp ?? `${watch.type} watch on ${watch.targetId}`;
    router.emit(ASSISTANT_EVENTS.MESSAGE.RESPONSE, {
      content: `Watch triggered: ${description}`,
      type: 'text',
    });
  });
  watchEvaluator.start();
}
