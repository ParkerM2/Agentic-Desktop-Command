/**
 * useGitHubAuthSettings — logic hook for GitHubAuthSettings
 */

import { useQuery } from '@tanstack/react-query';

import { APP } from '@shared/ipc/app/channels';

import { useAuthPolling } from '@renderer/shared/hooks/useAuthPolling';
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

  const isInstalled = auth?.installed ?? false;
  const isAuthenticated = auth?.authenticated ?? false;

  const { authorizing, handleAuthorize: startPolling } = useAuthPolling(
    refetch,
    isAuthenticated,
  );

  function handleConnect() {
    startPolling();
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
