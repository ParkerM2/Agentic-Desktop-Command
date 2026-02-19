/**
 * Merge query keys factory
 */
export const mergeKeys = {
  all: ['merge'] as const,
  diff: (repoPath: string, sourceBranch: string, targetBranch: string) =>
    [...mergeKeys.all, 'diff', repoPath, sourceBranch, targetBranch] as const,
  fileDiff: (repoPath: string, sourceBranch: string, targetBranch: string, filePath: string) =>
    [...mergeKeys.all, 'fileDiff', repoPath, sourceBranch, targetBranch, filePath] as const,
  conflicts: (repoPath: string, sourceBranch: string, targetBranch: string) =>
    [...mergeKeys.all, 'conflicts', repoPath, sourceBranch, targetBranch] as const,
};
