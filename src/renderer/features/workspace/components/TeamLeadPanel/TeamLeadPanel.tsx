/**
 * TeamLeadPanel — A single Team Lead session card in the right column.
 *
 * Collapsible. Shows session status, message stream, and input.
 * Mortal Team Leads (index >= 1) show a stop button.
 */

import { ChevronDown, ChevronUp, Send, X } from 'lucide-react';

import type { WorkspaceSession } from '@shared/ipc/workspace';

import { Button, Input, StatusIndicator, Text, ThinkingIndicator } from '@ui';

import { AgentChatPanel } from '@features/agent-dashboard';

import { useTeamLeadPanel } from './useTeamLeadPanel';

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
  const {
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
  } = useTeamLeadPanel(session);

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
              <AgentChatPanel messages={chatItems} showHandOff={false} />
            )}
          </div>

          {/* Thinking indicator */}
          {showThinking ? (
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
