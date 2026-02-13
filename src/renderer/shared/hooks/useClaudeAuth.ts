/**
 * useClaudeAuth — Query hook for Claude CLI installation and auth status
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

export function useClaudeAuth() {
  return useQuery({
    queryKey: ['app', 'claudeAuth'],
    queryFn: () => ipc('app.checkClaudeAuth', {}),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
