/**
 * PrimarySessionPanel — Left panel showing the always-on Primary Claude session.
 *
 * Renders streamed messages and a text input to send commands.
 */

import { Send } from 'lucide-react';

import { Button, Input, Separator, StatusIndicator, Text, ThinkingIndicator } from '@ui';

import { AgentChatPanel } from '@features/agent-dashboard';

import { usePrimarySessionPanel } from './usePrimarySessionPanel';

interface PrimarySessionPanelProps {
  sessionId: string;
  projectId: string;
  projectName: string;
  status: string;
}

function sessionStatusVariant(
  status: string,
): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'live') return 'success';
  if (status === 'restarting' || status === 'starting') return 'warning';
  return 'error';
}

export function PrimarySessionPanel({
  sessionId,
  projectId: _projectId,
  projectName,
  status,
}: PrimarySessionPanelProps) {
  const {
    send,
    showThinking,
    draft,
    setDraft,
    scrollRef,
    chatItems,
    handleSend,
    handleKeyDown,
  } = usePrimarySessionPanel({ sessionId, status });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex h-10 items-center gap-2 border-b px-4">
        <StatusIndicator size="sm" variant={sessionStatusVariant(status)} />
        <Text className="font-medium" size="sm" variant="muted">
          Primary · {projectName}
        </Text>
        <Text className="ml-auto opacity-60" size="sm" variant="muted">
          claude-sonnet-4-6
        </Text>
      </div>

      {/* Message stream */}
      <div ref={scrollRef} className="min-h-0 flex-1">
        {chatItems.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Text variant="muted">{status === 'starting' ? 'Starting session…' : 'Session ready. Send a message.'}</Text>
          </div>
        ) : (
          <AgentChatPanel messages={chatItems} />
        )}
      </div>

      {/* Thinking indicator */}
      {showThinking ? (
        <>
          <Separator />
          <div className="px-4 py-2">
            <ThinkingIndicator label={`Primary · ${projectName}`} size="sm" />
          </div>
        </>
      ) : null}

      {/* Input */}
      <Separator />
      <div className="flex gap-2 p-3">
        <Input
          className="flex-1"
          disabled={status !== 'live'}
          placeholder={status === 'live' ? 'Ask Claude or give a command…' : `Session ${status}…`}
          value={draft}
          onChange={(e) => setDraft(sessionId, e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          disabled={draft.trim().length === 0 || status !== 'live' || send.isPending}
          size="icon"
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
