/**
 * Assistant IPC handlers
 */

import type { AssistantService } from '../../services/assistant/assistant-service';
import type { IpcRouter } from '../router';

export function registerAssistantHandlers(router: IpcRouter, service: AssistantService): void {
  router.handle(
    'assistant.sendCommand',
    async ({ input, context }) => await service.sendCommand(input, context),
  );

  router.handle('assistant.getHistory', ({ limit }) => Promise.resolve(service.getHistory(limit)));

  router.handle('assistant.clearHistory', () => {
    service.clearHistory();
    return Promise.resolve({ success: true });
  });
}
