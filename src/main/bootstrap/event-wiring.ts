/**
 * Event Wiring — forwards service events to the renderer via IPC.
 *
 * Handles:
 * - Webhook relay → Hub WebSocket → assistant service
 * - Watch evaluator → proactive assistant notifications
 */

import { ASSISTANT_EVENTS } from '@shared/ipc/assistant/channels';

import type { IpcRouter } from '../ipc/router';
import type { createWatchEvaluator } from '../services/assistant/watch-evaluator';
import type { createHubConnectionManager } from '../services/hub/hub-connection';
import type { createWebhookRelay } from '../services/hub/webhook-relay';

interface EventWiringDeps {
  router: IpcRouter;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  webhookRelay: ReturnType<typeof createWebhookRelay>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
}

/** Wires all service events to IPC for renderer consumption. */
export function wireEventForwarding(deps: EventWiringDeps): void {
  const {
    router,
    watchEvaluator,
    webhookRelay,
    hubConnectionManager,
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

  // ─── Webhook relay — Hub WebSocket → assistant service ───────
  hubConnectionManager.onWebSocketMessage((data) => {
    webhookRelay.handleHubMessage(data);
  });
}
