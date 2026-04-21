/**
 * useClaudeCliStep — logic for ClaudeCliStep
 */

import { useEffect, useState } from 'react';

import { APP } from '@shared/ipc/app/channels';

import { useClaudeAuth } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

export function useClaudeCliStep() {
  const { data: auth, refetch } = useClaudeAuth();
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = auth?.authenticated ?? false;

  // Poll for auth status while authorizing
  useEffect(() => {
    if (!authorizing) return;
    const interval = setInterval(() => {
      void refetch();
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [authorizing, refetch]);

  // Stop polling once authenticated
  useEffect(() => {
    if (isAuthenticated && authorizing) {
      setAuthorizing(false);
    }
  }, [isAuthenticated, authorizing]);

  async function handleAuthorize() {
    setError(null);
    setAuthorizing(true);
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
