/**
 * TeamLeadPanel — A single Team Lead session card in the right column.
 *
 * Collapsible. Shows session status, message stream, and input.
 * Mortal Team Leads (index >= 1) show a stop button.
 */

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Send, X } from 'lucide-react';

import type { WorkspaceSession } from '@shared/ipc/workspace';
import type {
  AgentChatItem,
  AgentChatMessage,
  ContentBlock,
} from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { AgentChatPanel } from '@features/agent-dashboard';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Text } from '@ui/typography';

import { useStopTeamLead, useWorkspaceSend } from '../api/useWorkspace';
import { useWorkspaceStore } from '../store';

interface TeamLeadPanelProps {
  session: WorkspaceSession;
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

export function TeamLeadPanel({ session }: TeamLeadPanelProps) {
  const { key, agentSessionId, status } = session;
  const { projectId, index } = key;
  const isImmortal = index === 0;
  const label = index === 0 ? 'Team Lead 1' : `Team Lead ${index + 1}`;

  const send = useWorkspaceSend();
  const stop = useStopTeamLead(projectId);
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

  const statusColor = getStatusColor(status);

  return (
    <div className="border-border rounded-lg border">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={cn('h-2 w-2 rounded-full', statusColor)} />
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
          <div className="border-border max-h-48 overflow-y-auto border-t">
            {chatItems.length === 0 ? (
              <Text className="p-3" size="sm" variant="muted">
                {status === 'starting' ? 'Starting…' : 'Ready for a plan or instructions.'}
              </Text>
            ) : (
              <AgentChatPanel className="max-h-48" messages={chatItems} />
            )}
          </div>

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
