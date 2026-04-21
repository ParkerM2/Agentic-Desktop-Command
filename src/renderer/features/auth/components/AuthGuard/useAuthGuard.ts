/**
 * useAuthGuard — all logic for AuthGuard
 */

import { useEffect } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { useAuthInit } from '../../hooks/useAuthEvents';
import { useSessionEvents } from '../../hooks/useSessionEvents';
import { useTokenRefresh } from '../../hooks/useTokenRefresh';
import { useAuthStore } from '../../store';

export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const navigate = useNavigate();

  useAuthInit();
  useSessionEvents();
  useTokenRefresh();

  useEffect(() => {
    if (isInitializing) return;

    if (!isAuthenticated) {
      void navigate({ to: ROUTES.LOGIN });
    }
  }, [isInitializing, isAuthenticated, navigate]);

  return {
    isAuthenticated,
    isInitializing,
  };
}
