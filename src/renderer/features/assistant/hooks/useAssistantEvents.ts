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

export function useAssistantEvents() {
  const queryClient = useQueryClient();
  const { addResponseEntry, incrementUnread, setCurrentResponse, setIsThinking } =
    useAssistantStore();
  const isWidgetOpen = useAssistantWidgetStore((s) => s.isOpen);

  useIpcEvent('event:assistant.response', (payload) => {
    setCurrentResponse(payload.content);
    if (!isWidgetOpen) {
      incrementUnread();
    }
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });

  useIpcEvent('event:assistant.thinking', (payload) => {
    setIsThinking(payload.isThinking);
  });

  useIpcEvent('event:assistant.commandCompleted', () => {
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });

  useIpcEvent('event:assistant.proactive', (payload) => {
    const followUpText = payload.followUp ? `\n\nYou said: "${payload.followUp}"` : '';
    addResponseEntry({
      input: 'System notification',
      response: `${payload.content}${followUpText}`,
      type: 'proactive',
      source: payload.source,
    });
    if (!isWidgetOpen) {
      incrementUnread();
    }
    void queryClient.invalidateQueries({ queryKey: assistantKeys.history() });
  });
}
