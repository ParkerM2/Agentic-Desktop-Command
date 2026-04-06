/**
 * Assistant IPC handlers
 *
 * NOTE: sendCommand output and getHistory output shapes will be aligned with
 * the simplified IPC schema in Task 11. Until then, results are cast.
 */

import type { InvokeOutput } from '@shared/ipc-contract';

import type { AssistantService } from '../../services/assistant/assistant-service';
import type { IpcRouter } from '../router';

export function registerAssistantHandlers(router: IpcRouter, service: AssistantService): void {
  router.handle('assistant.start', ({ projects }) => {
    service.start(projects);
    return Promise.resolve(
      { success: true } as unknown as InvokeOutput<'assistant.start'>,
    );
  });

  router.handle('assistant.sendCommand', ({ input, context }) => {
    service.sendCommand(input, context);
    return Promise.resolve(
      { success: true } as unknown as InvokeOutput<'assistant.sendCommand'>,
    );
  });

  router.handle('assistant.getHistory', () =>
    Promise.resolve(
      service.getHistory() as unknown as InvokeOutput<'assistant.getHistory'>,
    ),
  );

  router.handle('assistant.clearHistory', () => {
    service.clearHistory();
    return Promise.resolve({ success: true });
  });
}
