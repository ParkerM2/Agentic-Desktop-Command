/**
 * React Query hooks for auth operations
 */

import { useCallback } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AUTH } from '@shared/ipc/auth/channels';
import type { LoginInput, RegisterInput } from '@shared/types/auth';

import { ipc } from '@renderer/shared/lib/ipc';
import { useLayoutStore } from '@renderer/shared/stores';

import { useAuthStore } from '../store';

import { authKeys } from './queryKeys';

/** Login mutation — stores tokens + user on success */
export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setExpiresAt = useAuthStore((s) => s.setExpiresAt);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => ipc(AUTH.LOGIN.USER, data),
    onSuccess: (result) => {
      setAuth(result.user, result.tokens);
      setExpiresAt(Date.now() + result.tokens.expiresIn * 1000);
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** Register mutation — stores tokens + user on success */
export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setExpiresAt = useAuthStore((s) => s.setExpiresAt);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => ipc(AUTH.REGISTER.USER, data),
    onSuccess: (result) => {
      setAuth(result.user, result.tokens);
      setExpiresAt(Date.now() + result.tokens.expiresIn * 1000);
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** Logout mutation — clears auth store and all query cache */
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc(AUTH.LOGOUT.USER, {}),
    onSuccess: () => {
      clearAuth();
      useLayoutStore.getState().clearLayout();
      queryClient.clear();
    },
  });
}

/** Refresh token mutation — updates tokens in store */
export function useRefreshToken() {
  const updateTokens = useAuthStore((s) => s.updateTokens);
  const setExpiresAt = useAuthStore((s) => s.setExpiresAt);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: () => ipc(AUTH.REFRESH.TOKEN, { refreshToken: refreshToken ?? '' }),
    onSuccess: (result) => {
      updateTokens(result.tokens);
      setExpiresAt(Date.now() + result.tokens.expiresIn * 1000);
    },
  });
}

/**
 * Force-logout helper — clears both main process tokens (via IPC) and
 * renderer state. Used when token refresh fails and we need to ensure
 * stale tokens are removed from both layers.
 *
 * The IPC call may fail if the Hub is unreachable — that's OK, we still
 * clear the renderer state to force re-login.
 */
export function useForceLogout(): () => Promise<void> {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useCallback(async () => {
    try {
      await ipc(AUTH.LOGOUT.USER, {});
    } catch {
      // Hub unreachable — ignore, we'll clear local state regardless
    }
    clearAuth();
    useLayoutStore.getState().clearLayout();
  }, [clearAuth]);
}

/** Fetch current user — only runs when authenticated, staleTime: 5 minutes */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => ipc(AUTH.GET.USER, {}),
    enabled: isAuthenticated,
    staleTime: 300_000,
  });
}
