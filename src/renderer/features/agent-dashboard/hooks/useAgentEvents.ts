/**
 * Agent dashboard IPC event subscriptions -> query invalidation
 *
 * Bridges real-time events from the main process to React Query cache.
 * - Session lifecycle events invalidate the session list/detail queries.
 * - Message events append to the per-session message cache directly.
 * - All subscriptions are cleaned up automatically on unmount via useIpcEvent.
 */

import { useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import type { AgentChatMessage } from '@shared/types/agent-dashboard';

import { useIpcEvent } from '@renderer/shared/hooks';

import { agentDashboardKeys } from '../api/queryKeys';

import { rule, useQueryInvalidator } from './useQueryInvalidator';

const INVALIDATION_RULES = [
  rule({
    channel: AGENT_DASHBOARD_EVENTS.SESSION.STARTED,
    queryKeys: (session) => [agentDashboardKeys.sessions(), agentDashboardKeys.session(session.id)],
  }),
  rule({
    channel: AGENT_DASHBOARD_EVENTS.SESSION.ENDED,
    queryKeys: (p) => [agentDashboardKeys.sessions(), agentDashboardKeys.session(p.sessionId)],
  }),
  rule({
    channel: AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'],
    queryKeys: (p) => [agentDashboardKeys.sessions(), agentDashboardKeys.session(p.sessionId)],
  }),
  rule({
    channel: AGENT_DASHBOARD_EVENTS.TEAMMATE.JOINED,
    queryKeys: () => [agentDashboardKeys.sessions()],
  }),
  rule({
    channel: AGENT_DASHBOARD_EVENTS.TEAMMATE.LEFT,
    queryKeys: () => [agentDashboardKeys.sessions()],
  }),
];

export function useAgentDashboardEvents() {
  const queryClient = useQueryClient();

  // ── Declarative invalidation rules ──
  useQueryInvalidator(INVALIDATION_RULES);

  // ── Messages (uses setQueryData, not invalidation) ──

  /** New message received -> append to that session's message cache */
  useIpcEvent(AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED, (message) => {
    queryClient.setQueryData<AgentChatMessage[]>(
      agentDashboardKeys.messages(message.agentId),
      (old) => {
        const existing = old ?? [];
        // Deduplicate by message ID to handle potential redeliveries
        const alreadyExists = existing.some((m) => m.id === message.id);
        if (alreadyExists) {
          return existing;
        }
        return [
          ...existing,
          {
            id: message.id,
            agentId: message.agentId,
            role: message.role,
            content: message.content as AgentChatMessage['content'],
            timestamp: message.timestamp,
            isStreaming: message.isStreaming === true ? true : undefined,
          },
        ];
      },
    );
  });
}
