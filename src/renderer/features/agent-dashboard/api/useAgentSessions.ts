/**
 * Agent session query hooks
 *
 * React Query hooks for fetching agent session data via IPC.
 * Session list refreshes on a 5s stale window; individual sessions
 * use a tighter 2s window for near-real-time status display.
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { agentDashboardKeys } from './queryKeys';

/** Fetch all active agent sessions, optionally filtered by type or team */
export function useAgentSessions(options?: {
  type?: 'project-owner' | 'team-lead' | 'teammate';
  teamName?: string;
}) {
  return useQuery({
    queryKey: agentDashboardKeys.sessions(),
    queryFn: () =>
      ipc('agent-dashboard.listSessions', {
        type: options?.type,
        teamName: options?.teamName,
      }),
    staleTime: 5_000,
  });
}

/** Fetch a single agent session by ID */
export function useAgentSession(sessionId: string | null) {
  return useQuery({
    queryKey: agentDashboardKeys.session(sessionId ?? ''),
    queryFn: () =>
      ipc('agent-dashboard.getSession', {
        sessionId: sessionId ?? '',
      }),
    enabled: sessionId !== null,
    staleTime: 2_000,
  });
}
