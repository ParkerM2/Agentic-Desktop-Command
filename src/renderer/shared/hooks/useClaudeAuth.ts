/**
 * useClaudeAuth — Query hook for Claude CLI installation and auth status
 */

import { useQuery } from '@tanstack/react-query';

import { APP } from '@shared/ipc/app/channels';

import { ipc } from '@renderer/shared/lib/ipc';

export function useClaudeAuth() {
  return useQuery({
    queryKey: ['app', 'claudeAuth'],
    queryFn: () => ipc(APP.CHECK['CLAUDE-AUTH'], {}),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
