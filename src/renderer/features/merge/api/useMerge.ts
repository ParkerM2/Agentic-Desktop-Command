/**
 * React Query hooks for merge operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { gitKeys } from '@features/projects';

import { mergeKeys } from './queryKeys';

interface MergeBranchParams {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
}

/** Fetch diff between source and target branches */
export function useMergeDiff(
  repoPath: string | null,
  sourceBranch: string | null,
  targetBranch: string | null,
) {
  const enabled = repoPath !== null && sourceBranch !== null && targetBranch !== null;

  return useQuery({
    queryKey: mergeKeys.diff(repoPath ?? '', sourceBranch ?? '', targetBranch ?? ''),
    queryFn: () =>
      ipc('merge.previewDiff', {
        repoPath: repoPath ?? '',
        sourceBranch: sourceBranch ?? '',
        targetBranch: targetBranch ?? '',
      }),
    enabled,
    staleTime: 30_000,
  });
}

/** Check for merge conflicts between branches */
export function useMergeConflicts(
  repoPath: string | null,
  sourceBranch: string | null,
  targetBranch: string | null,
) {
  const enabled = repoPath !== null && sourceBranch !== null && targetBranch !== null;

  return useQuery({
    queryKey: mergeKeys.conflicts(repoPath ?? '', sourceBranch ?? '', targetBranch ?? ''),
    queryFn: () =>
      ipc('merge.checkConflicts', {
        repoPath: repoPath ?? '',
        sourceBranch: sourceBranch ?? '',
        targetBranch: targetBranch ?? '',
      }),
    enabled,
    staleTime: 30_000,
  });
}

/** Merge source branch into target branch */
export function useMergeBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoPath, sourceBranch, targetBranch }: MergeBranchParams) =>
      ipc('merge.mergeBranch', { repoPath, sourceBranch, targetBranch }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gitKeys.status(variables.repoPath),
      });
      void queryClient.invalidateQueries({
        queryKey: gitKeys.branches(variables.repoPath),
      });
      void queryClient.invalidateQueries({
        queryKey: mergeKeys.all,
      });
    },
  });
}

/** Abort an in-progress merge */
export function useAbortMerge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoPath: string) => ipc('merge.abort', { repoPath }),
    onSuccess: (_data, repoPath) => {
      void queryClient.invalidateQueries({
        queryKey: gitKeys.status(repoPath),
      });
      void queryClient.invalidateQueries({
        queryKey: mergeKeys.all,
      });
    },
  });
}
