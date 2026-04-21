/**
 * Assistant IPC event listeners -> store updates + query invalidation
 *
 * Subscribes to assistant response and thinking events from the main process.
 */

import { useQueryClient } from '@tanstack/react-query';

import { ASSISTANT_EVENTS } from '@shared/ipc/assistant/channels';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';
import { useAssistantWidgetStore } from '@renderer/shared/stores';

import { assistantKeys } from '../api/queryKeys';
import { useAssistantStore } from '../store';

export function useAssistantEvents() {
  const queryClient = useQueryClient();
  const { addResponseEntry, incrementUnread, setCurrentResponse, setIsThinking } = useAssistantStore();
  const { isOpen, open } = useAssistantWidgetStore();

  useIpcEvent(ASSISTANT_EVENTS.SESSION.AUTOSTART, () => {
    open();
  });

  useIpcEvent(ASSISTANT_EVENTS.MESSAGE.RESPONSE, (payload) => {
    setCurrentResponse(payload.content);
    addResponseEntry({
      response: payload.content,
      type: payload.type,
    });
    if (!isOpen) {
      incrementUnread();
    }
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });

  useIpcEvent(ASSISTANT_EVENTS.MESSAGE.THINKING, (payload) => {
    setIsThinking(payload.isThinking);
  });

  useIpcEvent(ASSISTANT_EVENTS.TOOL.EXECUTED, (payload) => {
    // Invalidate React Query caches for all affected query key roots
    for (const root of payload.queryKeyRoots) {
      void queryClient.invalidateQueries({ queryKey: [root] });
    }
  });
}
