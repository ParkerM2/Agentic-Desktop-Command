/**
 * Merge query keys factory
 */
export const mergeKeys = {
  all: ['merge'] as const,
  diff: (repoPath: string, sourceBranch: string, targetBranch: string) =>
    [...mergeKeys.all, 'diff', repoPath, sourceBranch, targetBranch] as const,
  conflicts: (repoPath: string, sourceBranch: string, targetBranch: string) =>
    [...mergeKeys.all, 'conflicts', repoPath, sourceBranch, targetBranch] as const,
};
