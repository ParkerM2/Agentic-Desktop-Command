import { useQuery } from '@tanstack/react-query';

import { GIT } from '@shared/ipc/git/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { gitOverviewKeys } from './queryKeys';

/** Fetch commit history for a repository */
export function useCommitHistory({
  repoPath,
  branch,
  limit,
}: {
  repoPath: string;
  branch?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: gitOverviewKeys.commitHistory(repoPath, branch, limit),
    queryFn: () => ipc(GIT.LIST.COMMITS, { repoPath, branch, limit }),
    enabled: repoPath.length > 0,
    staleTime: 30_000,
  });
}
