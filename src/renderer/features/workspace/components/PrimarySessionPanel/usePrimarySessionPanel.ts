import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { useWorkspaceSend } from '../../api/useWorkspace';
import { useSessionMessageInput } from '../../hooks/useSessionMessageInput';
import { useSessionThinking } from '../../hooks/useSessionThinking';
import { messagesToChatItems } from '../../lib/chat-utils';
import { useWorkspaceStore } from '../../store';

interface UsePrimarySessionPanelProps {
  sessionId: string;
  status: string;
}

export function usePrimarySessionPanel({ sessionId, status }: UsePrimarySessionPanelProps) {
  const send = useWorkspaceSend();
  const isThinking = useSessionThinking(sessionId);
  const showThinking = send.isPending || isThinking;
  const draft = useWorkspaceStore((s) => s.inputDrafts[sessionId] ?? '');
  const setDraft = useWorkspaceStore((s) => s.setInputDraft);
  const clearDraft = useWorkspaceStore((s) => s.clearInputDraft);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: rawMessages = [] } = useQuery<AgentChatMessage[]>({
    queryKey: ['agent-dashboard', 'messages', sessionId],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });

  const chatItems = messagesToChatItems(rawMessages);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatItems.length]);

  const { handleSend, handleKeyDown } = useSessionMessageInput({
    sessionId,
    draft,
    status,
    send,
    clearDraft,
  });

  return {
    send,
    showThinking,
    draft,
    setDraft,
    scrollRef,
    chatItems,
    handleSend,
    handleKeyDown,
    // Derived mutation states
    isSending: send.isPending,
  };
}
