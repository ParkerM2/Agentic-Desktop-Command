/**
 * Auth event hooks — session restoration and auth lifecycle
 *
 * On app startup, calls `auth.restore` IPC channel to ask the main process
 * to restore the session from its encrypted token store. If successful,
 * populates the auth store. If not, redirects to login.
 */

import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { AUTH } from '@shared/ipc/auth/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { authKeys } from '../api/queryKeys';
import { useAuthStore } from '../store';

/**
 * Restores auth session from the main process encrypted token store.
 *
 * Calls `auth.restore` IPC — the main process checks its encrypted
 * TokenStore for a stored refresh token, refreshes via Hub, and returns
 * a discriminated union: `{ restored: true, user, tokens }` or
 * `{ restored: false }`.
 *
 * If the user is already authenticated (e.g., from a manual login during
 * this session), the restore is skipped.
 *
 * Call this once at the app root level (AuthGuard).
 */
export function useAuthInit(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setExpiresAt = useAuthStore((s) => s.setExpiresAt);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Already authenticated from manual login — skip restore
    if (isAuthenticated && !isInitializing) return;

    void (async () => {
      try {
        const result = await ipc(AUTH.RESTORE.SESSION, {});

        if (result.restored) {
          setAuth(result.user, result.tokens);
          setExpiresAt(Date.now() + result.tokens.expiresIn * 1000);
          void queryClient.invalidateQueries({ queryKey: authKeys.me() });
        } else if (!isAuthenticated) {
          // Only clear auth if we don't already have a cached session.
          // If localStorage has valid auth data from a previous session,
          // keep the user logged in — the token refresh hook will retry.
          clearAuth();
        }
        // If restore failed but isAuthenticated is true (from localStorage),
        // keep the cached session. Hub may be temporarily unreachable.
      } catch {
        if (!isAuthenticated) {
          clearAuth();
        }
        // Keep cached session on network errors
      } finally {
        setInitializing(false);
      }
    })();
  }, [isAuthenticated, isInitializing, setAuth, setExpiresAt, clearAuth, setInitializing, queryClient]);
}
