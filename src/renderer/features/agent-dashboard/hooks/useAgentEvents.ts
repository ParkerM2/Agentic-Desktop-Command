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

export function useAgentDashboardEvents() {
  const queryClient = useQueryClient();

  // ── Session lifecycle ──

  /** New session spawned or detected -> refresh session list */
  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION.STARTED, (session) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.sessions(),
    });
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.session(session.id),
    });
  });

  /** Session ended -> refresh session list and detail */
  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION.ENDED, (payload) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.sessions(),
    });
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.session(payload.sessionId),
    });
  });

  /** Session status changed -> refresh that session's detail */
  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'], (payload) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.sessions(),
    });
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.session(payload.sessionId),
    });
  });

  // ── Team membership ──

  /** Teammate joined -> refresh session list */
  useIpcEvent(AGENT_DASHBOARD_EVENTS.TEAMMATE.JOINED, (_member) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.sessions(),
    });
  });

  /** Teammate left -> refresh session list */
  useIpcEvent(AGENT_DASHBOARD_EVENTS.TEAMMATE.LEFT, (_payload) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.sessions(),
    });
  });

  // ── Messages ──

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
