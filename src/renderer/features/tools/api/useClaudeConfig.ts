/**
 * useClaudeConfig — React Query hook for Claude config scan results
 *
 * Fetches skills, agents, and commands from the .claude/ directory via IPC.
 */

import { useQuery } from '@tanstack/react-query';

import { CLAUDE } from '@shared/ipc/claude/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { toolsKeys } from './queryKeys';

export function useClaudeConfig(projectPath?: string) {
  return useQuery({
    queryKey: [...toolsKeys.claudeConfig(), projectPath ?? ''],
    queryFn: () => ipc(CLAUDE.SCAN.CONFIG, { projectPath }),
    staleTime: 30_000,
  });
}
