/**
 * GitHub React Query hooks
 *
 * Fetches GitHub data via IPC using the typed contract.
 * Re-exports shared types for component convenience.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { GitHubIssue, GitHubNotification, GitHubPullRequest } from '@shared/types';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

import { useGitHubStore } from '../store';

import { githubKeys } from './queryKeys';

// Re-export shared types for components
export type { GitHubIssue, GitHubNotification, GitHubPullRequest };

/** Alias for components that use the shorter name */
export type GitHubPr = GitHubPullRequest;

// ── Auth & Repos ─────────────────────────────────────────────

/** Check gh CLI auth status (installed, authenticated, username, scopes) */
export function useGitHubAuthStatus() {
  return useQuery({
    queryKey: githubKeys.authStatus(),
    queryFn: () => ipc('github.authStatus', {}),
    staleTime: 60_000,
  });
}

/** Fetch list of repos accessible to the authenticated GitHub user */
export function useGitHubRepos() {
  return useQuery({
    queryKey: githubKeys.repos(),
    queryFn: () => ipc('github.getRepos', { limit: 30 }),
    staleTime: 120_000,
  });
}

// ── Hooks ────────────────────────────────────────────────────

/** Fetch pull requests for the active repo */
export function useGitHubPrs() {
  const { owner, repo } = useGitHubStore();

  return useQuery({
    queryKey: githubKeys.prList(owner, repo),
    queryFn: () => ipc('github.listPrs', { owner, repo }),
    enabled: owner.length > 0 && repo.length > 0,
    staleTime: 60_000,
  });
}

/** Fetch a single PR detail */
export function useGitHubPrDetail(prNumber: number | null) {
  const { owner, repo } = useGitHubStore();

  return useQuery({
    queryKey: githubKeys.prDetail(owner, repo, prNumber ?? 0),
    queryFn: () => ipc('github.getPr', { owner, repo, number: prNumber ?? 0 }),
    enabled: prNumber !== null && owner.length > 0,
    staleTime: 60_000,
  });
}

/** Fetch issues for the active repo */
export function useGitHubIssues() {
  const { owner, repo } = useGitHubStore();

  return useQuery({
    queryKey: githubKeys.issueList(owner, repo),
    queryFn: () => ipc('github.listIssues', { owner, repo }),
    enabled: owner.length > 0 && repo.length > 0,
    staleTime: 60_000,
  });
}

/** Fetch notifications for the authenticated user */
export function useGitHubNotifications() {
  return useQuery({
    queryKey: githubKeys.notifications(),
    queryFn: () => ipc('github.getNotifications', {}),
    staleTime: 60_000,
  });
}

/** Create a new GitHub issue */
export function useCreateIssue() {
  const queryClient = useQueryClient();
  const { owner, repo } = useGitHubStore();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (input: { title: string; body?: string; labels?: string[] }) =>
      ipc('github.createIssue', { owner, repo, ...input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: githubKeys.issueList(owner, repo) });
    },
    onError: onError('create issue'),
  });
}
