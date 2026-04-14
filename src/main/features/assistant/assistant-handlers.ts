/**
 * Assistant IPC handlers
 *
 * NOTE: sendCommand output and getHistory output shapes will be aligned with
 * the simplified IPC schema in Task 11. Until then, results are cast.
 */

import { ASSISTANT } from '@shared/ipc/assistant/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

import type { AssistantService } from "./assistant-service";
import type { IpcRouter } from '../../ipc/router';

export function registerAssistantHandlers(router: IpcRouter, service: AssistantService): void {
  router.handle(ASSISTANT.START.SESSION, ({ projects }) => {
    void Promise.resolve(service.start(projects)).catch((err: unknown) => {
      console.error('[assistant-handlers] service.start failed:', err);
    });
    return Promise.resolve(
      { success: true } as unknown as InvokeOutput<typeof ASSISTANT.START.SESSION>,
    );
  });

  router.handle(ASSISTANT.SEND.COMMAND, ({ input, context }) => {
    service.sendCommand(input, context);
    return Promise.resolve(
      { success: true } as unknown as InvokeOutput<typeof ASSISTANT.SEND.COMMAND>,
    );
  });

  router.handle(ASSISTANT.GET.HISTORY, () =>
    Promise.resolve(
      service.getHistory() as unknown as InvokeOutput<typeof ASSISTANT.GET.HISTORY>,
    ),
  );

  router.handle(ASSISTANT.CLEAR.HISTORY, () => {
    service.clearHistory();
    return Promise.resolve({ success: true });
  });
}
