/**
 * useIntegrationsStep — logic for IntegrationsStep (includes GitHub auth)
 */

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { APP } from '@shared/ipc/app/channels';

import { useAuthPolling } from '@renderer/shared/hooks/useAuthPolling';
import { ipc } from '@renderer/shared/lib/ipc';

// ── GitHub Auth Hook ─────────────────────────────────────────

export function useGitHubAuth() {
  return useQuery({
    queryKey: ['app', 'githubAuth'],
    queryFn: () => ipc(APP.CHECK['GITHUB-AUTH'], {}),
    staleTime: 30_000,
  });
}

// ── Main Hook ─────────────────────────────────────────────────

export function useIntegrationsStep() {
  const { data: ghAuth, refetch } = useGitHubAuth();
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = ghAuth?.authenticated ?? false;
  const isInstalled = ghAuth?.installed ?? false;

  const { authorizing, setAuthorizing, handleAuthorize: startPolling } = useAuthPolling(
    refetch,
    isAuthenticated,
  );

  async function handleConnect() {
    setError(null);
    startPolling();
    const result = await ipc(APP.LAUNCH['GITHUB-AUTH'], {});
    if (!result.success && !isAuthenticated) {
      setError(
        'GitHub authorization failed. Make sure the GitHub CLI is installed (https://cli.github.com).',
      );
      setAuthorizing(false);
    }
  }

  return {
    ghAuth,
    isAuthenticated,
    isInstalled,
    authorizing,
    error,
    handleConnect,
  };
}
