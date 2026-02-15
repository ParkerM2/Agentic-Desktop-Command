/**
 * AuthGuard — protects authenticated routes.
 *
 * Reads isAuthenticated from the auth store. If not authenticated, redirects
 * to /login. Calls useAuthInit() to restore session from localStorage on
 * app startup, showing a spinner while token validation is in progress.
 */

import { useEffect, useRef, useState } from 'react';

import { Outlet, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { ThemeHydrator } from '@renderer/shared/stores';

import { useAuthInit } from '../hooks/useAuthEvents';
import { useAuthStore } from '../store';

/**
 * Time (ms) to wait for auth init to settle before redirecting.
 * Allows useAuthInit to validate/refresh tokens from localStorage.
 */
const AUTH_INIT_DELAY_MS = 100;

export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const hasChecked = useRef(false);

  // Restore session from localStorage on app startup
  useAuthInit();

  useEffect(() => {
    if (hasChecked.current) return;

    // Brief delay to let useAuthInit complete token restoration
    const timer = setTimeout(() => {
      hasChecked.current = true;
      setIsChecking(false);
    }, AUTH_INIT_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isChecking) return;

    if (!isAuthenticated) {
      void navigate({ to: ROUTES.LOGIN });
    }
  }, [isChecking, isAuthenticated, navigate]);

  // Show loading spinner during initial auth check
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ThemeHydrator />
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated — will redirect via the effect above
  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}
