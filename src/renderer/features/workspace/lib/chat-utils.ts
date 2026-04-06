/**
 * chat-utils — Shared utilities for workspace chat panels.
 */

import type {
  AgentChatItem,
  AgentChatMessage,
  ContentBlock,
} from '@shared/types/agent-dashboard';

export function getStatusColor(status: string): string {
  if (status === 'live') return 'bg-green-500';
  if (status === 'restarting' || status === 'starting') return 'animate-pulse bg-yellow-500';
  return 'bg-red-500';
}

export function contentBlocksToString(blocks: ContentBlock[]): string {
  return blocks
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('');
}

export function messagesToChatItems(messages: AgentChatMessage[]): AgentChatItem[] {
  return messages
    .map((msg) => ({
      kind: 'text' as const,
      message: {
        id: msg.id,
        role: msg.role,
        content: contentBlocksToString(msg.content),
        timestamp: msg.timestamp,
        isStreaming: msg.isStreaming,
      },
    }))
    .filter((item) => item.message.content.trim().length > 0 || item.message.isStreaming === true);
}
