/**
 * Agent message query hooks
 *
 * Messages are event-driven — they accumulate from IPC push events
 * rather than polling. The query provides the initial cache structure;
 * useAgentDashboardEvents appends new messages via setQueryData.
 *
 * The queryFn returns an empty array because messages are populated
 * entirely through real-time events. The cache is the source of truth
 * for the current session's message history.
 *
 * Two hooks available:
 * - useAgentMessages: full AgentChatMessage[] for chat panels
 * - useAgentMessagePreviews: lightweight text previews for status displays
 */

import { useQuery } from '@tanstack/react-query';

import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import type { AgentMessagePreview } from '@renderer/shared/components/EventBridge';

import { agentDashboardKeys } from './queryKeys';

/**
 * Access the message cache for a given agent session.
 *
 * Returns `AgentChatMessage[]` — initially empty, populated by
 * `event:agent-dashboard.messageReceived` via useAgentDashboardEvents.
 */
export function useAgentMessages(sessionId: string | null) {
  return useQuery<AgentChatMessage[]>({
    queryKey: agentDashboardKeys.messages(sessionId ?? ''),
    queryFn: (): AgentChatMessage[] => [],
    enabled: sessionId !== null,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Access lightweight message previews for a session.
 *
 * Returns `AgentMessagePreview[]` — text-only previews of assistant messages,
 * populated by EventBridge's append handler for `event:agent-dashboard.messageReceived`.
 *
 * Use this for status displays (live agent preview, recent messages list)
 * where full content blocks are not needed.
 */
export function useAgentMessagePreviews(sessionId: string | undefined): AgentMessagePreview[] {
  const { data } = useQuery<AgentMessagePreview[]>({
    queryKey: ['agent-messages', sessionId ?? ''],
    queryFn: (): AgentMessagePreview[] => [],
    enabled: sessionId !== undefined,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });
  return data ?? [];
}
