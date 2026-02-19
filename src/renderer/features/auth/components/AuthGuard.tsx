/**
 * AuthGuard — protects authenticated routes.
 *
 * Reads isAuthenticated and isInitializing from the auth store. While init is
 * in progress, shows a spinner. Once init completes, redirects unauthenticated
 * users to /login. Calls useAuthInit() to restore session from localStorage.
 */

import { useEffect } from 'react';

import { Outlet, useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { ThemeHydrator } from '@renderer/shared/stores';

import { Spinner } from '@ui';

import { useAuthInit } from '../hooks/useAuthEvents';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { useAuthStore } from '../store';

export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const navigate = useNavigate();

  // Restore session from localStorage on app startup
  useAuthInit();
  // Proactively refresh tokens before expiry
  useTokenRefresh();

  useEffect(() => {
    if (isInitializing) return;

    if (!isAuthenticated) {
      void navigate({ to: ROUTES.LOGIN });
    }
  }, [isInitializing, isAuthenticated, navigate]);

  // Show loading spinner during initial auth check
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ThemeHydrator />
        <Spinner className="text-muted-foreground" size="lg" />
      </div>
    );
  }

  // Not authenticated — will redirect via the effect above
  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}
