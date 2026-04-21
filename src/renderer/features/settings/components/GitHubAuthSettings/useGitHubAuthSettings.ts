/**
 * useGitHubAuthSettings — logic hook for GitHubAuthSettings
 */

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { APP } from '@shared/ipc/app/channels';

import { ipc } from '@renderer/shared/lib/ipc';

function useGitHubAuth() {
  return useQuery({
    queryKey: ['app', 'githubAuth'],
    queryFn: () => ipc(APP.CHECK['GITHUB-AUTH'], {}),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useGitHubAuthSettings() {
  const { data: auth, isLoading, refetch } = useGitHubAuth();
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

  function handleConnect() {
    setAuthorizing(true);
    void ipc(APP.LAUNCH['GITHUB-AUTH'], {});
  }

  return {
    auth,
    isLoading,
    authorizing,
    isInstalled,
    isAuthenticated,
    handleConnect,
  };
}
