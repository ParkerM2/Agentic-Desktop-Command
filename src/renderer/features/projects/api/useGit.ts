/**
 * React Query hooks for git operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { GIT } from '@shared/ipc/git/channels';
import { MERGE } from '@shared/ipc/misc/merge.channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { projectKeys } from './queryKeys';

/** Query key factory for git queries */
export const gitKeys = {
  all: ['git'] as const,
  status: (repoPath: string) => [...gitKeys.all, 'status', repoPath] as const,
  branches: (repoPath: string) => [...gitKeys.all, 'branches', repoPath] as const,
  worktrees: (projectId: string) => [...gitKeys.all, 'worktrees', projectId] as const,
  structure: (repoPath: string) => [...gitKeys.all, 'structure', repoPath] as const,
};

/** Fetch git status for a repository */
export function useGitStatus(repoPath: string | null) {
  return useQuery({
    queryKey: gitKeys.status(repoPath ?? ''),
    queryFn: () => ipc(GIT.GET.STATUS, { repoPath: repoPath ?? '' }),
    enabled: repoPath !== null,
    refetchInterval: 10_000,
  });
}

/** Fetch branches for a repository */
export function useGitBranches(repoPath: string | null) {
  return useQuery({
    queryKey: gitKeys.branches(repoPath ?? ''),
    queryFn: () => ipc(GIT.GET.BRANCHES, { repoPath: repoPath ?? '' }),
    enabled: repoPath !== null,
  });
}

/** Fetch worktrees for a project */
export function useWorktrees(projectId: string | null) {
  return useQuery({
    queryKey: gitKeys.worktrees(projectId ?? ''),
    queryFn: () => ipc(GIT.LIST.WORKTREES, { projectId: projectId ?? '' }),
    enabled: projectId !== null,
  });
}

/** Detect repository structure */
export function useRepoStructure(repoPath: string | null) {
  return useQuery({
    queryKey: gitKeys.structure(repoPath ?? ''),
    queryFn: () => ipc(GIT.DETECT.STRUCTURE, { repoPath: repoPath ?? '' }),
    enabled: repoPath !== null,
    staleTime: 300_000,
  });
}

/** Create a new branch */
export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { repoPath: string; branchName: string; baseBranch?: string }) =>
      ipc(GIT.CREATE.BRANCH, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gitKeys.branches(variables.repoPath),
      });
      void queryClient.invalidateQueries({
        queryKey: gitKeys.status(variables.repoPath),
      });
    },
  });
}

/** Create a new worktree */
export function useCreateWorktree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { repoPath: string; worktreePath: string; branch: string }) =>
      ipc(GIT.CREATE.WORKTREE, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Remove a worktree */
export function useRemoveWorktree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { repoPath: string; worktreePath: string }) =>
      ipc(GIT.REMOVE.WORKTREE, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Preview diff between two branches */
export function useMergePreview() {
  return useMutation({
    mutationFn: (input: { repoPath: string; sourceBranch: string; targetBranch: string }) =>
      ipc(MERGE.PREVIEW.DIFF, input),
  });
}

/** Check for merge conflicts between two branches */
export function useCheckConflicts() {
  return useMutation({
    mutationFn: (input: { repoPath: string; sourceBranch: string; targetBranch: string }) =>
      ipc(MERGE.CHECK.CONFLICTS, input),
  });
}

/** Merge a source branch into a target branch */
export function useMergeBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { repoPath: string; sourceBranch: string; targetBranch: string }) =>
      ipc(MERGE.EXECUTE.MERGE, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gitKeys.status(variables.repoPath),
      });
      void queryClient.invalidateQueries({
        queryKey: gitKeys.branches(variables.repoPath),
      });
    },
  });
}

/** Abort an in-progress merge */
export function useAbortMerge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repoPath: string) => ipc(MERGE.ABORT.MERGE, { repoPath }),
    onSuccess: (_data, repoPath) => {
      void queryClient.invalidateQueries({
        queryKey: gitKeys.status(repoPath),
      });
    },
  });
}
