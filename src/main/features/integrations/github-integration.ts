/**
 * GitHub Integration — re-export from github service and handlers.
 *
 * Service wraps the gh CLI client for GitHub API access.
 * Maps raw API responses to the shared GitHubPullRequest / GitHubIssue / GitHubNotification types.
 */

import type { PrDiffFile } from '@shared/ipc/github';
import { GITHUB, GITHUB_EVENTS } from '@shared/ipc/github/channels';
import type { GitHubIssue, GitHubNotification, GitHubPullRequest } from '@shared/types';

import type { IpcRouter } from '../../ipc/router';
import type {
  GitHubAuthStatus,
  GitHubClient,
  GitHubRepo,
} from '../../mcp-servers/github/github-client';
import type { Issue, Notification, PullRequest } from '../../mcp-servers/github/types';

// ── Interface ─────────────────────────────────────────────────

export interface GitHubService {
  getAuthStatus: () => Promise<GitHubAuthStatus>;

  getRepos: (params?: { limit?: number }) => Promise<GitHubRepo[]>;

  listPrs: (params: {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
  }) => Promise<GitHubPullRequest[]>;

  getPr: (params: { owner: string; repo: string; number: number }) => Promise<GitHubPullRequest>;

  getPrFiles: (params: { owner: string; repo: string; number: number }) => Promise<PrDiffFile[]>;

  listIssues: (params: {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
  }) => Promise<GitHubIssue[]>;

  createIssue: (params: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }) => Promise<GitHubIssue>;

  getNotifications: (params?: { all?: boolean }) => Promise<GitHubNotification[]>;
}

// ── Mappers ───────────────────────────────────────────────────

function mapPr(raw: PullRequest): GitHubPullRequest {
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    body: raw.body ?? '',
    state: raw.state,
    merged: raw.merged,
    draft: raw.draft,
    author: raw.user.login,
    authorAvatar: raw.user.avatar_url,
    url: raw.html_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    headBranch: raw.head.ref,
    baseBranch: raw.base.ref,
    labels: raw.labels.map((l) => ({ name: l.name, color: l.color })),
    reviewers: raw.requested_reviewers.map((r) => r.login),
    comments: raw.review_comments,
    additions: raw.additions,
    deletions: raw.deletions,
    changedFiles: raw.changed_files,
  };
}

function mapIssue(raw: Issue): GitHubIssue {
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    body: raw.body ?? '',
    state: raw.state,
    author: raw.user.login,
    authorAvatar: raw.user.avatar_url,
    url: raw.html_url,
    labels: raw.labels.map((l) => ({ name: l.name, color: l.color })),
    assignees: raw.assignees.map((a) => a.login),
    comments: raw.comments,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapNotification(raw: Notification): GitHubNotification {
  return {
    id: raw.id,
    unread: raw.unread,
    reason: raw.reason,
    title: raw.subject.title,
    type: raw.subject.type,
    repoName: raw.repository.full_name,
    updatedAt: raw.updated_at,
  };
}

// ── Factory ───────────────────────────────────────────────────

export function createGitHubService(deps: {
  client: GitHubClient;
  router: IpcRouter;
}): GitHubService {
  const { client, router } = deps;

  function emitUpdated(type: 'pr' | 'issue' | 'notification', owner: string, repo: string): void {
    router.emit(GITHUB_EVENTS.DATA.UPDATED, { type, owner, repo });
  }

  return {
    async getAuthStatus() {
      return await client.getAuthStatus();
    },

    async getRepos(params) {
      return await client.getRepos(params);
    },

    async listPrs(params) {
      const raw = await client.listPrs(params);
      return raw.map(mapPr);
    },

    async getPr(params) {
      const raw = await client.getPr(params);
      return mapPr(raw);
    },

    async getPrFiles(params) {
      return await client.getPrFiles(params);
    },

    async listIssues(params) {
      const raw = await client.listIssues(params);
      return raw.map(mapIssue);
    },

    async createIssue(params) {
      const raw = await client.createIssue(params);
      emitUpdated('issue', params.owner, params.repo);
      return mapIssue(raw);
    },

    async getNotifications(params) {
      const raw = await client.getNotifications(params);
      return raw.map(mapNotification);
    },
  };
}

// ── Handlers ──────────────────────────────────────────────────

export function registerGitHubHandlers(router: IpcRouter, service: GitHubService): void {
  router.handle(GITHUB.GET['AUTH-STATUS'], async () => {
    return await service.getAuthStatus();
  });

  router.handle(GITHUB.LIST.REPOS, async (params) => {
    return await service.getRepos(params);
  });

  router.handle(GITHUB.LIST.PRS, async (params) => {
    return await service.listPrs(params);
  });

  router.handle(GITHUB.GET.PR, async (params) => {
    return await service.getPr(params);
  });

  router.handle(GITHUB.LIST.ISSUES, async (params) => {
    return await service.listIssues(params);
  });

  router.handle(GITHUB.CREATE.ISSUE, async (params) => {
    return await service.createIssue(params);
  });

  router.handle(GITHUB.GET.NOTIFICATIONS, async (params) => {
    return await service.getNotifications(params);
  });
}
