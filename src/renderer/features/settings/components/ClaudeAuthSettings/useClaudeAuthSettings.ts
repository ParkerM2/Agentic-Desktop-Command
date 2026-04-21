/**
 * useClaudeAuthSettings — logic hook for ClaudeAuthSettings
 */

import { APP } from '@shared/ipc/app/channels';

import { useClaudeAuth } from '@renderer/shared/hooks';
import { useAuthPolling } from '@renderer/shared/hooks/useAuthPolling';
import { ipc } from '@renderer/shared/lib/ipc';

export function useClaudeAuthSettings() {
  const { data: auth, isLoading, refetch } = useClaudeAuth();

  const isInstalled = auth?.installed ?? false;
  const isAuthenticated = auth?.authenticated ?? false;

  const { authorizing, handleAuthorize: startPolling } = useAuthPolling(
    refetch,
    isAuthenticated,
  );

  function handleAuthorize() {
    startPolling();
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
