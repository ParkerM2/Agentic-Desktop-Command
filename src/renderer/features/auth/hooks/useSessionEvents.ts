/**
 * Session change IPC event listeners -> query cache invalidation
 *
 * Listens for user session changes (login/logout) from the main process
 * and clears the React Query cache to ensure stale user data is not
 * displayed after switching accounts.
 *
 * This is critical for user-scoped storage: when the main process
 * reinitializes services with a new user's data directory, the renderer
 * must also clear its cached queries to fetch fresh data.
 */

import { useQueryClient } from '@tanstack/react-query';

import { AUTH_EVENTS } from '@shared/ipc/auth/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

/**
 * Clears all cached queries when the user session changes.
 *
 * Call this from AuthGuard to ensure it runs for all authenticated routes.
 */
export function useSessionEvents(): void {
  const queryClient = useQueryClient();

  useIpcEvent(AUTH_EVENTS.SESSION.CHANGED, () => {
    // Clear the entire query cache when session changes.
    // This ensures no stale data from the previous user is displayed.
    queryClient.clear();
  });
}
