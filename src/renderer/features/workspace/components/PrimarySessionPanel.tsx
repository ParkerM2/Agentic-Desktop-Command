/**
 * PrimarySessionPanel — Left panel showing the always-on Primary Claude session.
 *
 * Renders streamed messages and a text input to send commands.
 */

import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';

import type {
  AgentChatItem,
  AgentChatMessage,
  ContentBlock,
} from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { AgentChatPanel } from '@features/agent-dashboard';

import { Button } from '@ui/button';
import { Input } from '@ui/input';

import { useWorkspaceSend } from '../api/useWorkspace';
import { useWorkspaceStore } from '../store';

interface PrimarySessionPanelProps {
  sessionId: string;
  projectId: string;
  projectName: string;
  status: string;
}

function getStatusColor(status: string): string {
  if (status === 'live') return 'bg-green-500';
  if (status === 'restarting' || status === 'starting') return 'animate-pulse bg-yellow-500';
  return 'bg-red-500';
}

function contentBlocksToString(blocks: ContentBlock[]): string {
  return blocks
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('');
}

function messagesToChatItems(messages: AgentChatMessage[]): AgentChatItem[] {
  return messages.map((msg) => ({
    kind: 'text' as const,
    message: {
      id: msg.id,
      role: msg.role,
      content: contentBlocksToString(msg.content),
      timestamp: msg.timestamp,
      isStreaming: msg.isStreaming,
    },
  }));
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

  const statusColor = getStatusColor(status);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center gap-2 border-b px-4 py-2">
        <span className={cn('h-2 w-2 rounded-full', statusColor)} />
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Primary · {projectName}
        </span>
        <span className="text-muted-foreground ml-auto text-xs opacity-60">claude-sonnet-4-6</span>
      </div>

      {/* Message stream */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {chatItems.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {status === 'starting' ? 'Starting session…' : 'Session ready. Send a message.'}
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
