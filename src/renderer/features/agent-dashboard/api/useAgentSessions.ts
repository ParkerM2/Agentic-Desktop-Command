/**
 * Agent session query hooks
 *
 * React Query hooks for fetching agent session data via IPC.
 * Session list refreshes on a 5s stale window; individual sessions
 * use a tighter 2s window for near-real-time status display.
 */

import { useQuery } from '@tanstack/react-query';

import { AGENT_DASHBOARD } from '@shared/ipc/agent-dashboard/channels';

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
      ipc(AGENT_DASHBOARD.LIST.SESSIONS, {
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
      ipc(AGENT_DASHBOARD.GET.SESSION, {
        sessionId: sessionId ?? '',
      }),
    enabled: sessionId !== null,
    staleTime: 2_000,
  });
}

/** Fetch all agent sessions associated with a task slug */
export function useSessionsForTask(slug: string | null) {
  return useQuery({
    queryKey: agentDashboardKeys.sessionsForTask(slug ?? ''),
    queryFn: () =>
      ipc(AGENT_DASHBOARD.LIST['SESSIONS-FOR-TASK'], { slug: slug ?? '' }),
    enabled: slug !== null && slug !== '',
    staleTime: 5_000,
  });
}

/** Fetch paginated session log entries for a session */
export function useSessionLog(
  sessionId: string | null,
  options?: { offset?: number; limit?: number },
) {
  return useQuery({
    queryKey: agentDashboardKeys.sessionLog(sessionId ?? ''),
    queryFn: () =>
      ipc(AGENT_DASHBOARD.GET['SESSION-LOG'], {
        sessionId: sessionId ?? '',
        offset: options?.offset,
        limit: options?.limit,
      }),
    enabled: sessionId !== null,
    staleTime: 5_000,
  });
}

/** Fetch the git diff for a session's working branch */
export function useGitDiff(sessionId: string | null) {
  return useQuery({
    queryKey: agentDashboardKeys.gitDiff(sessionId ?? ''),
    queryFn: () =>
      ipc(AGENT_DASHBOARD.GET['GIT-DIFF'], { sessionId: sessionId ?? '' }),
    enabled: sessionId !== null,
    staleTime: 10_000,
  });
}
