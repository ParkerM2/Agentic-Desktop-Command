/**
 * Proactive token refresh hook — schedules a timer to refresh the
 * access token before it expires, preventing silent auth expiry
 * during active sessions.
 */

import { useEffect } from 'react';

import { AUTH } from '@shared/ipc/auth/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useForceLogout } from '../api/useAuth';
import { useAuthStore } from '../store';

/** Refresh 2 minutes before token expiry */
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

/**
 * Schedules a proactive token refresh before the access token expires.
 *
 * Reads `expiresAt` from the auth store and sets a timer to fire
 * `REFRESH_BUFFER_MS` (2 minutes) before expiry. On successful refresh,
 * updates tokens and reschedules. On failure, clears auth in both the
 * main process (via IPC) and renderer to force re-login.
 *
 * Must be called within a component that renders while authenticated
 * (e.g., AuthGuard).
 */
export function useTokenRefresh(): void {
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const updateTokens = useAuthStore((s) => s.updateTokens);
  const setExpiresAt = useAuthStore((s) => s.setExpiresAt);
  const forceLogout = useForceLogout();

  useEffect(() => {
    if (!isAuthenticated || expiresAt === null || !refreshToken) {
      return;
    }

    const delay = expiresAt - Date.now() - REFRESH_BUFFER_MS;

    const refresh = async (): Promise<void> => {
      try {
        const result = await ipc(AUTH.REFRESH.TOKEN, { refreshToken });
        updateTokens(result.tokens);
        setExpiresAt(Date.now() + result.tokens.expiresIn * 1000);
      } catch {
        await forceLogout();
      }
    };

    if (delay <= 0) {
      void refresh();
      return;
    }

    const timerId = setTimeout(() => {
      void refresh();
    }, delay);

    return () => {
      clearTimeout(timerId);
    };
  }, [expiresAt, isAuthenticated, refreshToken, updateTokens, setExpiresAt, forceLogout]);
}
