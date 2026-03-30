/**
 * Diff viewer query keys factory
 */
export const diffKeys = {
  all: ['diff'] as const,
  summary: (repoPath: string, ref: string) =>
    [...diffKeys.all, 'summary', repoPath, ref] as const,
  file: (repoPath: string, ref: string, filePath: string) =>
    [...diffKeys.all, 'file', repoPath, ref, filePath] as const,
};
