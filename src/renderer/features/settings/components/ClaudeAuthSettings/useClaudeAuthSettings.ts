/**
 * useClaudeAuthSettings — logic hook for ClaudeAuthSettings
 */

import { useEffect, useState } from 'react';

import { APP } from '@shared/ipc/app/channels';

import { useClaudeAuth } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

export function useClaudeAuthSettings() {
  const { data: auth, isLoading, refetch } = useClaudeAuth();
  const [authorizing, setAuthorizing] = useState(false);

  const isInstalled = auth?.installed ?? false;
  const isAuthenticated = auth?.authenticated ?? false;

  useEffect(() => {
    if (!authorizing) return;
    const interval = setInterval(() => {
      void refetch();
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [authorizing, refetch]);

  useEffect(() => {
    if (isAuthenticated && authorizing) {
      setAuthorizing(false);
    }
  }, [isAuthenticated, authorizing]);

  function handleAuthorize() {
    setAuthorizing(true);
    void ipc(APP.LAUNCH['CLAUDE-AUTH'], {});
  }

  return {
    auth,
    isLoading,
    authorizing,
    isInstalled,
    isAuthenticated,
    handleAuthorize,
  };
}
