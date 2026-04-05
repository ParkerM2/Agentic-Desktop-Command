/**
 * Assistant IPC event listeners -> store updates + query invalidation
 *
 * Subscribes to assistant response and thinking events from the main process.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';
import { useAssistantWidgetStore } from '@renderer/shared/stores';

import { assistantKeys } from '../api/queryKeys';
import { useAssistantStore } from '../store';

/** Ref shared between useAssistantEvents and useSendCommand to track the last input */
let _lastCommand = '';
export function setLastCommand(input: string): void {
  _lastCommand = input;
}

export function useAssistantEvents() {
  const queryClient = useQueryClient();
  const { addResponseEntry, incrementUnread, setCurrentResponse, setIsThinking } = useAssistantStore();
  const { isOpen, open } = useAssistantWidgetStore();
  useIpcEvent('event:assistant.autostart', () => {
    open();
  });

  useIpcEvent('event:assistant.response', (payload) => {
    setCurrentResponse(payload.content);
    addResponseEntry({
      input: _lastCommand,
      response: payload.content,
      type: payload.type,
    });
    if (!isOpen) {
      incrementUnread();
    }
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });

  useIpcEvent('event:assistant.thinking', (payload) => {
    setIsThinking(payload.isThinking);
  });

  useIpcEvent('event:assistant.toolExecuted', (payload) => {
    // Invalidate React Query caches for all affected query key roots
    for (const root of payload.queryKeyRoots) {
      void queryClient.invalidateQueries({ queryKey: [root] });
    }
  });
}
