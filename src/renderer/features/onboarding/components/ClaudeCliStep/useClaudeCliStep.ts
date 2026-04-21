/**
 * useClaudeCliStep — logic for ClaudeCliStep
 */

import { useState } from 'react';

import { APP } from '@shared/ipc/app/channels';

import { useClaudeAuth } from '@renderer/shared/hooks';
import { useAuthPolling } from '@renderer/shared/hooks/useAuthPolling';
import { ipc } from '@renderer/shared/lib/ipc';

export function useClaudeCliStep() {
  const { data: auth, refetch } = useClaudeAuth();
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = auth?.authenticated ?? false;

  const { authorizing, setAuthorizing, handleAuthorize: startPolling } = useAuthPolling(
    refetch,
    isAuthenticated,
  );

  async function handleAuthorize() {
    setError(null);
    startPolling();
    const result = await ipc(APP.LAUNCH['CLAUDE-AUTH'], {});
    if (!result.success && !isAuthenticated) {
      setError('Authorization failed. Make sure Claude Code is installed (npm install -g @anthropic-ai/claude-code).');
      setAuthorizing(false);
    }
  }

  return {
    isAuthenticated,
    authorizing,
    error,
    handleAuthorize,
  };
}
