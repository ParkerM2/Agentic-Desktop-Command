/**
 * React Query hooks for git operations in the Git Dashboard feature.
 *
 * Re-exports query/mutation hooks built on top of the GIT IPC channels.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GIT, GIT_EVENTS } from '@shared/ipc/git/channels';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';
import { ipc } from '@renderer/shared/lib/ipc';

import { gitOverviewKeys } from './queryKeys';

// ─── Query Hooks ──────────────────────────────────────────────

/** Fetch git status for a repository */
export function useGitStatus(repoPath: string | null) {
  return useQuery({
    queryKey: gitOverviewKeys.status(repoPath ?? ''),
    queryFn: () => ipc(GIT.GET.STATUS, { repoPath: repoPath ?? '' }),
    enabled: repoPath !== null,
    refetchInterval: 10_000,
  });
}

/** Fetch branches for a repository */
export function useGitBranches(repoPath: string | null) {
  return useQuery({
    queryKey: gitOverviewKeys.branches(repoPath ?? ''),
    queryFn: () => ipc(GIT.GET.BRANCHES, { repoPath: repoPath ?? '' }),
    enabled: repoPath !== null,
    staleTime: 30_000,
  });
}

export { useCommitHistory } from './useCommitHistory';

/** Fetch worktrees for a project */
export function useListWorktrees(projectId: string | null) {
  return useQuery({
    queryKey: gitOverviewKeys.worktrees(projectId ?? ''),
    queryFn: () => ipc(GIT.LIST.WORKTREES, { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    staleTime: 30_000,
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────

/** Create a new branch */
export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { repoPath: string; branchName: string; baseBranch?: string }) =>
      ipc(GIT.CREATE.BRANCH, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gitOverviewKeys.branches(variables.repoPath),
      });
      void queryClient.invalidateQueries({
        queryKey: gitOverviewKeys.status(variables.repoPath),
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
      void queryClient.invalidateQueries({ queryKey: gitOverviewKeys.all });
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
      void queryClient.invalidateQueries({ queryKey: gitOverviewKeys.all });
    },
  });
}

/** Commit staged/all changes */
export function useGitCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectPath: string; message: string; files?: string[] }) =>
      ipc(GIT.COMMIT.CHANGES, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gitOverviewKeys.status(variables.projectPath),
      });
    },
  });
}

/** Push changes to remote */
export function useGitPush() {
  return useMutation({
    mutationFn: (input: { projectPath: string; remote?: string; branch?: string }) =>
      ipc(GIT.PUSH.CHANGES, input),
  });
}

/** Create a GitHub pull request */
export function useCreatePr() {
  return useMutation({
    mutationFn: (input: {
      projectPath: string;
      title: string;
      body: string;
      baseBranch: string;
      headBranch: string;
    }) => ipc(GIT.CREATE.PR, input),
  });
}

// ─── Event Hooks ──────────────────────────────────────────────

/** Subscribe to worktree change events and invalidate relevant queries */
export function useGitOverviewEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(GIT_EVENTS.WORKTREE.CHANGED, ({ projectId }) => {
    void queryClient.invalidateQueries({
      queryKey: gitOverviewKeys.worktrees(projectId),
    });
  });
}
