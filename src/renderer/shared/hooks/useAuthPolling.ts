/**
 * useAuthPolling — shared polling hook for auth flows
 *
 * Polls `refetch` at `intervalMs` while `authorizing` is true,
 * then auto-stops when `isAuthenticated` flips to true.
 */

import { useCallback, useEffect, useState } from 'react';

export function useAuthPolling(
  refetch: () => unknown,
  isAuthenticated: boolean,
  intervalMs = 3000,
) {
  const [authorizing, setAuthorizing] = useState(false);

  useEffect(() => {
    if (!authorizing) return;
    const interval = setInterval(() => {
      void refetch();
    }, intervalMs);
    return () => {
      clearInterval(interval);
    };
  }, [authorizing, refetch, intervalMs]);

  useEffect(() => {
    if (isAuthenticated && authorizing) {
      setAuthorizing(false);
    }
  }, [isAuthenticated, authorizing]);

  const handleAuthorize = useCallback(() => {
    setAuthorizing(true);
  }, []);

  return { authorizing, setAuthorizing, handleAuthorize };
}
