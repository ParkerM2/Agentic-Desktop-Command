/**
 * AuthGuard — protects authenticated routes.
 *
 * Reads isAuthenticated and isInitializing from the auth store. While init is
 * in progress, shows a spinner. Once init completes, redirects unauthenticated
 * users to /login. Calls useAuthInit() to restore session via auth.restore IPC.
 */

import { Outlet } from '@tanstack/react-router';

import { Spinner } from '@ui';

import { useAuthGuard } from './useAuthGuard';

export function AuthGuard() {
  const { isAuthenticated, isInitializing } = useAuthGuard();

  if (isInitializing) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Spinner className="text-muted-foreground" size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}
