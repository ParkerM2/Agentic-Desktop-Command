/**
 * GitHub React Query hooks
 *
 * Fetches GitHub data via IPC using the typed contract.
 * Re-exports shared types for component convenience.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GITHUB } from '@shared/ipc/github/channels';
import type { GitHubIssue, GitHubNotification, GitHubPullRequest } from '@shared/types';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

import { useIntegrationsStore } from '../store';

import { integrationsKeys } from './queryKeys';

// Re-export shared types for components
export type { GitHubIssue, GitHubNotification, GitHubPullRequest };

/** Alias for components that use the shorter name */
export type GitHubPr = GitHubPullRequest;

// ── Auth & Repos ─────────────────────────────────────────────

/** Check gh CLI auth status (installed, authenticated, username, scopes) */
export function useGitHubAuthStatus() {
  return useQuery({
    queryKey: integrationsKeys.githubAuthStatus(),
    queryFn: () => ipc(GITHUB.GET['AUTH-STATUS'], {}),
    staleTime: 60_000,
  });
}

/** Fetch list of repos accessible to the authenticated GitHub user */
export function useGitHubRepos() {
  return useQuery({
    queryKey: integrationsKeys.githubRepos(),
    queryFn: () => ipc(GITHUB.LIST.REPOS, { limit: 30 }),
    staleTime: 120_000,
  });
}

// ── Hooks ────────────────────────────────────────────────────

/** Fetch pull requests for the active repo */
export function useGitHubPrs() {
  const { githubOwner: owner, githubRepo: repo } = useIntegrationsStore();

  return useQuery({
    queryKey: integrationsKeys.githubPrList(owner, repo),
    queryFn: () => ipc(GITHUB.LIST.PRS, { owner, repo }),
    enabled: owner.length > 0 && repo.length > 0,
    staleTime: 60_000,
  });
}

/** Fetch a single PR detail */
export function useGitHubPrDetail(prNumber: number | null) {
  const { githubOwner: owner, githubRepo: repo } = useIntegrationsStore();

  return useQuery({
    queryKey: integrationsKeys.githubPrDetail(owner, repo, prNumber ?? 0),
    queryFn: () => ipc(GITHUB.GET.PR, { owner, repo, number: prNumber ?? 0 }),
    enabled: prNumber !== null && owner.length > 0,
    staleTime: 60_000,
  });
}

/** Fetch diff files for a single PR */
export function usePrDiff(prNumber: number | null) {
  const { githubOwner: owner, githubRepo: repo } = useIntegrationsStore();

  return useQuery({
    queryKey: integrationsKeys.githubPrDiff(owner, repo, prNumber ?? 0),
    queryFn: () => ipc(GITHUB.GET.PR_FILES, { owner, repo, number: prNumber ?? 0 }),
    enabled: prNumber !== null && owner.length > 0 && repo.length > 0,
    staleTime: 300_000,
  });
}

/** Fetch issues for the active repo */
export function useGitHubIssues() {
  const { githubOwner: owner, githubRepo: repo } = useIntegrationsStore();

  return useQuery({
    queryKey: integrationsKeys.githubIssueList(owner, repo),
    queryFn: () => ipc(GITHUB.LIST.ISSUES, { owner, repo }),
    enabled: owner.length > 0 && repo.length > 0,
    staleTime: 60_000,
  });
}

/** Fetch notifications for the authenticated user */
export function useGitHubNotifications() {
  return useQuery({
    queryKey: integrationsKeys.githubNotifications(),
    queryFn: () => ipc(GITHUB.GET.NOTIFICATIONS, {}),
    staleTime: 60_000,
  });
}

/** Create a new GitHub issue */
export function useCreateIssue() {
  const queryClient = useQueryClient();
  const { githubOwner: owner, githubRepo: repo } = useIntegrationsStore();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (input: { title: string; body?: string; labels?: string[] }) =>
      ipc(GITHUB.CREATE.ISSUE, { owner, repo, ...input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.githubIssueList(owner, repo),
      });
    },
    onError: onError('create issue'),
  });
}
