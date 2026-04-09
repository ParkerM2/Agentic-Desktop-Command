/**
 * Agent streaming hook
 *
 * Handles `stream_event` tokens for real-time streaming display.
 * Accumulates partial text into the current message using requestAnimationFrame
 * to debounce renders during fast token delivery.
 *
 * Exposes per-session `isStreaming` state and the accumulated partial text
 * so components can show a typing indicator and live content.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { useIpcEvent } from '@renderer/shared/hooks';

import { agentDashboardKeys } from '../api/queryKeys';

interface StreamState {
  /** Whether this session is currently receiving streaming tokens */
  isStreaming: boolean;
  /** The accumulated partial text for the current streaming message */
  partialText: string;
  /** Session ID this stream state belongs to */
  sessionId: string;
}

/**
 * Subscribe to stream events for a specific agent session.
 *
 * Accumulates `content_block_delta` text deltas and batches React Query
 * cache updates using requestAnimationFrame to avoid excessive re-renders.
 */
export function useAgentStream(sessionId: string | null): StreamState {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const partialTextRef = useRef('');
  const [partialText, setPartialText] = useState('');
  const rafIdRef = useRef<number | null>(null);
  const activeSessionRef = useRef(sessionId);

  // Keep ref in sync with prop
  activeSessionRef.current = sessionId;

  const flushToCache = useCallback(() => {
    const sid = activeSessionRef.current;
    if (sid === null) return;

    const currentText = partialTextRef.current;
    setPartialText(currentText);

    // Update the last message in cache with accumulated text
    queryClient.setQueryData<AgentChatMessage[]>(
      agentDashboardKeys.messages(sid),
      (old) => {
        if (old === undefined || old.length === 0) return old;
        const messages = [...old];
        const lastMessage = messages.at(-1);
        if (lastMessage?.isStreaming !== true) return old;

        const updatedContent: AgentChatMessage['content'] =
          lastMessage.content.length > 0
            ? lastMessage.content.map((block, idx) =>
                idx === lastMessage.content.length - 1 && block.type === 'text'
                  ? { ...block, text: currentText }
                  : block,
              )
            : [{ type: 'text' as const, text: currentText }];

        messages[messages.length - 1] = {
          ...lastMessage,
          content: updatedContent,
        };
        return messages;
      },
    );

    rafIdRef.current = null;
  }, [queryClient]);

  // Listen to stream events for all sessions, filter to target
  useIpcEvent(AGENT_DASHBOARD_EVENTS.STREAM.EVENT, (payload) => {
    if (payload.sessionId !== activeSessionRef.current) return;

    const eventType = payload.event.type;
    const eventSubtype = payload.event.event_type ?? null;

    // Handle assistant message start -> mark streaming
    if (eventType === 'assistant') {
      setIsStreaming(true);
      partialTextRef.current = '';
      setPartialText('');
      return;
    }

    // Handle streaming deltas
    if (eventType === 'stream_event' && eventSubtype === 'content_block_delta') {
      const { delta } = payload.event;
      if (delta !== undefined && typeof delta.text === 'string') {
        partialTextRef.current += delta.text;
        setIsStreaming(true);

        // Debounce cache updates via rAF
        rafIdRef.current ??= requestAnimationFrame(flushToCache);
      }
      return;
    }

    // Handle message stop / result -> finalize streaming
    if (eventType === 'result' || eventSubtype === 'message_stop') {
      setIsStreaming(false);
      partialTextRef.current = '';

      // Flush any pending update
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      flushToCache();
    }
  });

  // Cleanup pending rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    isStreaming,
    partialText,
    sessionId: sessionId ?? '',
  };
}
