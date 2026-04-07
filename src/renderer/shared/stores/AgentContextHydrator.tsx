/**
 * AgentContextHydrator — Keeps the agent context store in sync with workspace sessions.
 *
 * Polls workspace sessions for the active project and syncs into
 * the global useAgentContext store. Also listens for workspace IPC
 * events to trigger immediate refreshes.
 *
 * Mount once in the app root (alongside LayoutHydrator / ThemeHydrator).
 */

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { useAgentContext } from './agent-context-store';
import { useLayoutStore } from './layout-store';

const WORKSPACE_SESSION_KEYS = {
  sessions: (projectId: string) => ['workspace', 'global-sessions', projectId] as const,
};

export function AgentContextHydrator() {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const setSessions = useAgentContext((s) => s.setSessions);
  const setIsLoading = useAgentContext((s) => s.setIsLoading);
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

  return null;
}
