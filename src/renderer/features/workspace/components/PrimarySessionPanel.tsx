/**
 * PrimarySessionPanel — Left panel showing the always-on Primary Claude session.
 *
 * Renders streamed messages and a text input to send commands.
 */

import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';

import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { AgentChatPanel } from '@features/agent-dashboard';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { StatusIndicator } from '@ui/status-indicator';
import { Text } from '@ui/typography';

import { useWorkspaceSend } from '../api/useWorkspace';
import { messagesToChatItems } from '../lib/chat-utils';
import { useWorkspaceStore } from '../store';

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
  const send = useWorkspaceSend();
  const draft = useWorkspaceStore((s) => s.inputDrafts[sessionId] ?? '');
  const setDraft = useWorkspaceStore((s) => s.setInputDraft);
  const clearDraft = useWorkspaceStore((s) => s.clearInputDraft);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reactively subscribe to the message cache (updated by useAgentDashboardEvents)
  const { data: rawMessages = [] } = useQuery<AgentChatMessage[]>({
    queryKey: ['agent-dashboard', 'messages', sessionId],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });

  const chatItems = messagesToChatItems(rawMessages);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatItems.length]);

  function handleSend() {
    const message = draft.trim();
    if (message.length === 0 || status !== 'live') return;
    send.mutate({ sessionId, message });
    clearDraft(sessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {chatItems.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Text variant="muted">{status === 'starting' ? 'Starting session…' : 'Session ready. Send a message.'}</Text>
          </div>
        ) : (
          <AgentChatPanel messages={chatItems} />
        )}
      </div>

      {/* Input */}
      <div className="border-border flex gap-2 border-t p-3">
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
