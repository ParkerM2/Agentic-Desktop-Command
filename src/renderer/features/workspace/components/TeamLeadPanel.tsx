/**
 * TeamLeadPanel — A single Team Lead session card in the right column.
 *
 * Collapsible. Shows session status, message stream, and input.
 * Mortal Team Leads (index >= 1) show a stop button.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Send, X } from 'lucide-react';

import type { WorkspaceSession } from '@shared/ipc/workspace';
import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { AgentChatPanel } from '@features/agent-dashboard';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { StatusIndicator } from '@ui/status-indicator';
import { ThinkingIndicator } from '@ui/thinking-indicator';
import { Text } from '@ui/typography';

import { useStopTeamLead, useWorkspaceSend } from '../api/useWorkspace';
import { useSessionThinking } from '../hooks/useSessionThinking';
import { messagesToChatItems } from '../lib/chat-utils';
import { useWorkspaceStore } from '../store';

interface TeamLeadPanelProps {
  session: WorkspaceSession;
}

function sessionStatusVariant(
  status: string,
): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'live') return 'success';
  if (status === 'restarting' || status === 'starting') return 'warning';
  return 'error';
}

export function TeamLeadPanel({ session }: TeamLeadPanelProps) {
  const { key, agentSessionId, status } = session;
  const { projectId, index } = key;
  const isImmortal = index === 0;
  const label = index === 0 ? 'Team Lead 1' : `Team Lead ${index + 1}`;

  const send = useWorkspaceSend();
  const stop = useStopTeamLead(projectId);
  const isThinking = useSessionThinking(agentSessionId);
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
  const DEFAULT_HEIGHT = 192;
  const MIN_HEIGHT = 64;

  const [messageHeight, setMessageHeight] = useState(DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const dragFromTop = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(DEFAULT_HEIGHT);
  const maxHeight = useRef(Infinity);
  const cardRef = useRef<HTMLDivElement>(null);
  const EDGE_ZONE = 6; // px from border edge that triggers resize cursor

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const rawDelta = e.clientY - startY.current;
    // Top edge: drag up (negative delta) = grow; bottom edge: drag down (positive) = grow
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
    // Scroll container is the overflow-y-auto parent
    const scrollParent = card.closest('[class*="overflow-y"]');
    if (!scrollParent || !(scrollParent instanceof HTMLElement)) return Infinity;
    const containerHeight = scrollParent.clientHeight;
    // Sum heights of all sibling cards (excluding this one) + gaps
    const siblingCards = scrollParent.querySelectorAll(':scope > div > div');
    let othersHeight = 0;
    for (const sibling of siblingCards) {
      if (sibling !== card) {
        othersHeight += (sibling as HTMLElement).offsetHeight;
      }
    }
    // Account for padding (p-3 = 12px * 2) and gaps (space-y-3 = 12px per gap)
    const gaps = Math.max(0, siblingCards.length - 1) * 12;
    const padding = 24;
    // Available for this card's message area = container - others - chrome - gaps - padding
    // Card chrome = header (~40px) + input (~44px) + borders (~4px)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- border-edge resize
    <div
      ref={cardRef}
      className="border-border rounded-lg border"
      onMouseDown={handleCardMouseDown}
      onMouseMove={handleCardMouseMove}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <StatusIndicator size="sm" variant={sessionStatusVariant(status)} />
        <Text className="font-medium" size="sm">{label}</Text>
        {status === 'restarting' ? (
          <Text size="sm" variant="muted">restarting…</Text>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          {!isImmortal && (
            <Button
              className="h-6 w-6"
              disabled={stop.isPending}
              size="icon"
              title="Stop team lead"
              variant="ghost"
              onClick={handleStop}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            className="h-6 w-6"
            size="icon"
            variant="ghost"
            onClick={() => toggle(agentSessionId)}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Collapsible body */}
      {!isCollapsed && (
        <>
          <div
            className="border-border border-t"
            style={{ height: messageHeight }}
          >
            {chatItems.length === 0 ? (
              <Text className="p-3" size="sm" variant="muted">
                {status === 'starting' ? 'Starting…' : 'Ready for a plan or instructions.'}
              </Text>
            ) : (
              <AgentChatPanel messages={chatItems} />
            )}
          </div>

          {/* Thinking indicator */}
          {isThinking ? (
            <div className="border-border border-t px-3 py-1.5">
              <ThinkingIndicator label={label} size="xs" />
            </div>
          ) : null}

          {/* Input */}
          <div className="border-border flex gap-2 border-t p-2">
            <Input
              className="h-7 flex-1 text-xs"
              disabled={status !== 'live'}
              placeholder={status === 'live' ? 'Send to team lead…' : `${status}…`}
              value={draft}
              onChange={(e) => setDraft(agentSessionId, e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              className="h-7 w-7"
              disabled={draft.trim().length === 0 || status !== 'live' || send.isPending}
              size="icon"
              onClick={handleSend}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>

        </>
      )}
    </div>
  );
}
