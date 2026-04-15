/**
 * Query key factory for git-overview feature
 */

export const gitOverviewKeys = {
  all: ['git-overview'] as const,
  status: (repoPath: string) => [...gitOverviewKeys.all, 'status', repoPath] as const,
  branches: (repoPath: string) => [...gitOverviewKeys.all, 'branches', repoPath] as const,
  worktrees: (projectId: string) => [...gitOverviewKeys.all, 'worktrees', projectId] as const,
  commitHistory: (repoPath: string, branch: string | undefined, limit: number | undefined) =>
    [...gitOverviewKeys.all, 'commitHistory', repoPath, branch, limit] as const,
};
