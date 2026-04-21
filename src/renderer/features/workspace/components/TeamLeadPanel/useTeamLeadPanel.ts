import { useCallback, useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { WorkspaceSession } from '@shared/ipc/workspace';
import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { useStopTeamLead, useWorkspaceSend } from '../../api/useWorkspace';
import { useSessionThinking } from '../../hooks/useSessionThinking';
import { messagesToChatItems } from '../../lib/chat-utils';
import { useWorkspaceStore } from '../../store';

const DEFAULT_HEIGHT = 192;
const MIN_HEIGHT = 64;
const EDGE_ZONE = 6;

export function useTeamLeadPanel(session: WorkspaceSession) {
  const { key, agentSessionId, status } = session;
  const { projectId, index } = key;
  const isImmortal = index === 0;
  const label = index === 0 ? 'Team Lead 1' : `Team Lead ${index + 1}`;

  const send = useWorkspaceSend();
  const stop = useStopTeamLead(projectId);
  const isThinking = useSessionThinking(agentSessionId);
  const showThinking = send.isPending || isThinking;

  const isCollapsed = useWorkspaceStore((s) => s.teamLeadCollapsed[agentSessionId] ?? false);
  const toggle = useWorkspaceStore((s) => s.toggleTeamLeadCollapsed);
  const draft = useWorkspaceStore((s) => s.inputDrafts[agentSessionId] ?? '');
  const setDraft = useWorkspaceStore((s) => s.setInputDraft);
  const clearDraft = useWorkspaceStore((s) => s.clearInputDraft);

  const { data: rawMessages = [] } = useQuery<AgentChatMessage[]>({
    queryKey: ['agent-dashboard', 'messages', agentSessionId],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const chatItems = messagesToChatItems(rawMessages);

  function handleSend() {
    const message = draft.trim();
    if (message.length === 0 || status !== 'live') return;
    send.mutate({ sessionId: agentSessionId, message });
    clearDraft(agentSessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleStop() {
    stop.mutate({ index });
  }

  /* ---- Drag-to-resize logic ---- */
  const [messageHeight, setMessageHeight] = useState(DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const dragFromTop = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(DEFAULT_HEIGHT);
  const maxHeight = useRef(Infinity);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const rawDelta = e.clientY - startY.current;
    const delta = dragFromTop.current ? -rawDelta : rawDelta;
    const next = Math.min(maxHeight.current, Math.max(MIN_HEIGHT, startHeight.current + delta));
    setMessageHeight(next);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  const getEdge = useCallback((e: React.MouseEvent): 'top' | 'bottom' | null => {
    const card = cardRef.current;
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    if (e.clientY - rect.top <= EDGE_ZONE) return 'top';
    if (rect.bottom - e.clientY <= EDGE_ZONE) return 'bottom';
    return null;
  }, []);

  const computeMaxHeight = useCallback(() => {
    const card = cardRef.current;
    if (!card) return Infinity;
    const scrollParent = card.closest('[class*="overflow-y"]');
    if (!scrollParent || !(scrollParent instanceof HTMLElement)) return Infinity;
    const containerHeight = scrollParent.clientHeight;
    const siblingCards = scrollParent.querySelectorAll(':scope > div > div');
    let othersHeight = 0;
    for (const sibling of siblingCards) {
      if (sibling !== card) {
        othersHeight += (sibling as HTMLElement).offsetHeight;
      }
    }
    const gaps = Math.max(0, siblingCards.length - 1) * 12;
    const padding = 24;
    const cardChrome = card.offsetHeight - messageHeight;
    return Math.max(MIN_HEIGHT, containerHeight - othersHeight - gaps - padding - cardChrome);
  }, [messageHeight]);

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const edge = getEdge(e);
      if (!edge) return;
      e.preventDefault();
      isDragging.current = true;
      dragFromTop.current = edge === 'top';
      startY.current = e.clientY;
      startHeight.current = messageHeight;
      maxHeight.current = computeMaxHeight();
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [messageHeight, handleDragMove, handleDragEnd, getEdge, computeMaxHeight],
  );

  const handleCardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const card = cardRef.current;
      if (!card || isDragging.current) return;
      card.style.cursor = getEdge(e) ? 'row-resize' : '';
    },
    [getEdge],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return {
    agentSessionId,
    status,
    label,
    isImmortal,
    send,
    stop,
    showThinking,
    isCollapsed,
    toggle,
    draft,
    setDraft,
    chatItems,
    messageHeight,
    cardRef,
    handleSend,
    handleKeyDown,
    handleStop,
    handleCardMouseDown,
    handleCardMouseMove,
    // Derived mutation states
    isSending: send.isPending,
    isStopping: stop.isPending,
  };
}
