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
 */

import { useQuery } from '@tanstack/react-query';

import type { AgentChatMessage } from '@shared/types/agent-dashboard';

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
