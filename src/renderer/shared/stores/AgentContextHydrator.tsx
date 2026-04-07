/**
 * AgentContextHydrator — Keeps the agent context store in sync with workspace sessions
 * and live agent message streams.
 *
 * Polls workspace sessions for the active project and syncs into the global
 * useAgentContext store. Subscribes to agent-dashboard IPC events for live
 * message/status updates so the UI reflects real-time agent activity.
 *
 * Mount once in the app root (alongside LayoutHydrator / ThemeHydrator).
 */

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { AgentChatMessage, ContentBlock } from '@shared/types/agent-dashboard';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { useAgentContext } from './agent-context-store';
import { useLayoutStore } from './layout-store';

const WORKSPACE_SESSION_KEYS = {
  sessions: (projectId: string) => ['workspace', 'global-sessions', projectId] as const,
};

// ─── Helpers ──────────────────────────────────────────────────

/** Extract a short text preview from a chat message's content blocks. */
function extractTextPreview(content: ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text' && block.text.length > 0) {
      return block.text.length > 200 ? `${block.text.slice(0, 200)}…` : block.text;
    }
  }
  return '';
}

// ─── Component ────────────────────────────────────────────────

export function AgentContextHydrator() {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const setSessions = useAgentContext((s) => s.setSessions);
  const setIsLoading = useAgentContext((s) => s.setIsLoading);
  const addRecentMessage = useAgentContext((s) => s.addRecentMessage);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: WORKSPACE_SESSION_KEYS.sessions(activeProjectId ?? ''),
    queryFn: () => ipc('workspace.getSessions', { projectId: activeProjectId ?? '' }),
    enabled: activeProjectId !== null,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  // Sync query data into the Zustand store
  useEffect(() => {
    setSessions(sessions ?? []);
  }, [sessions, setSessions]);

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  // Invalidate on workspace events for immediate refresh
  const invalidate = () => {
    if (!activeProjectId) return;
    void queryClient.invalidateQueries({
      queryKey: WORKSPACE_SESSION_KEYS.sessions(activeProjectId),
    });
  };

  useIpcEvent('event:workspace.sessionReady', invalidate);
  useIpcEvent('event:workspace.sessionCrashed', invalidate);
  useIpcEvent('event:workspace.sessionRestarted', invalidate);
  useIpcEvent('event:workspace.planHandedOff', invalidate);

  // ── Live agent message stream ──────────────────────────────
  // Capture assistant messages and store a text preview so the
  // progress detail row can show what the agent is doing in real-time.

  useIpcEvent('event:agent-dashboard.messageReceived', (message: AgentChatMessage) => {
    if (message.role !== 'assistant') return;
    const preview = extractTextPreview(message.content);
    if (preview.length === 0) return;

    addRecentMessage(message.agentId, {
      id: message.id,
      role: message.role,
      preview,
      timestamp: message.timestamp,
    });
  });

  // Refresh sessions when agent sessions start/end
  useIpcEvent('event:agent-dashboard.sessionStarted', invalidate);
  useIpcEvent('event:agent-dashboard.sessionEnded', invalidate);

  return null;
}
