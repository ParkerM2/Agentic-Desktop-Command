/**
 * React Query hooks for auth operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { LoginInput, RegisterInput } from '@shared/types/auth';

import { ipc } from '@renderer/shared/lib/ipc';

import { useAuthStore } from '../store';

import { authKeys } from './queryKeys';

/** Login mutation — stores tokens + user on success */
export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => ipc('auth.login', data),
    onSuccess: (result) => {
      setAuth(result.user, result.tokens);
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** Register mutation — stores tokens + user on success */
export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => ipc('auth.register', data),
    onSuccess: (result) => {
      setAuth(result.user, result.tokens);
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** Logout mutation — clears auth store and all query cache */
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc('auth.logout', {}),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

/** Refresh token mutation — updates tokens in store */
export function useRefreshToken() {
  const updateTokens = useAuthStore((s) => s.updateTokens);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: () => ipc('auth.refresh', { refreshToken: refreshToken ?? '' }),
    onSuccess: (result) => {
      updateTokens(result.tokens);
    },
  });
}

/** Fetch current user — only runs when authenticated, staleTime: 5 minutes */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => ipc('auth.me', {}),
    enabled: isAuthenticated,
    staleTime: 300_000,
  });
}
