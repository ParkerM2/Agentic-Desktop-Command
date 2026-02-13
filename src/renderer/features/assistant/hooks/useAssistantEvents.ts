/**
 * Assistant IPC event listeners -> store updates + query invalidation
 *
 * Subscribes to assistant response and thinking events from the main process.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';

import { assistantKeys } from '../api/queryKeys';
import { useAssistantStore } from '../store';

export function useAssistantEvents() {
  const queryClient = useQueryClient();
  const { setCurrentResponse, setIsThinking } = useAssistantStore();

  useIpcEvent('event:assistant.response', (payload) => {
    setCurrentResponse(payload.content);
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });

  useIpcEvent('event:assistant.thinking', (payload) => {
    setIsThinking(payload.isThinking);
  });

  useIpcEvent('event:assistant.commandCompleted', () => {
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });
}
