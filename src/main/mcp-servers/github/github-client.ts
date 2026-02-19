/**
 * GitHub REST API Client
 *
 * Wraps the GitHub REST API v3 using native fetch.
 * Handles rate limiting with exponential backoff.
 * Consumes tokens from the OAuth token store.
 */

import { mcpLogger } from '@main/lib/logger';

import type { Issue, Notification, PullRequest, PullRequestReview } from './types';

// ── Types ────────────────────────────────────────────────────

export interface GitHubClient {
  /** List pull requests for a repository */
  listPrs: (params: {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
  }) => Promise<PullRequest[]>;

  /** Get a single pull request with full details */
  getPr: (params: { owner: string; repo: string; number: number }) => Promise<PullRequest>;

  /** Submit a review on a pull request */
  reviewPr: (params: {
    owner: string;
    repo: string;
    number: number;
    body: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  }) => Promise<PullRequestReview>;

  /** List issues for a repository */
  listIssues: (params: {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
  }) => Promise<Issue[]>;

  /** Create a new issue */
  createIssue: (params: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }) => Promise<Issue>;

  /** Get notifications for the authenticated user */
  getNotifications: (params?: { all?: boolean }) => Promise<Notification[]>;

  /** Watch a repository for notifications */
  watchRepo: (params: { owner: string; repo: string }) => Promise<{ subscribed: boolean }>;
}

// ── Constants ────────────────────────────────────────────────

const BASE_URL = 'https://api.github.com';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ── Helpers ──────────────────────────────────────────────────

class GitHubApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);

    // Rate limit handling
    if (response.status === 403 || response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : INITIAL_BACKOFF_MS * 2 ** attempt;

      mcpLogger.warn(
        `[GitHubClient] Rate limited (${String(response.status)}), retrying in ${String(waitMs)}ms`,
      );
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new GitHubApiError(
        response.status,
        `GitHub API error ${String(response.status)}: ${body}`,
      );
    }

    return response;
  }

  throw lastError ?? new GitHubApiError(429, 'Max retries exceeded due to rate limiting');
}

// ── Factory ──────────────────────────────────────────────────

export function createGitHubClient(token: string): GitHubClient {
  const headers = buildHeaders(token);

  async function get<T>(path: string): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });
    return await (response.json() as Promise<T>);
  }

  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return await (response.json() as Promise<T>);
  }

  async function put<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return await (response.json() as Promise<T>);
  }

  return {
    async listPrs({ owner, repo, state = 'open' }) {
      return await get<PullRequest[]>(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`);
    },

    async getPr({ owner, repo, number }) {
      return await get<PullRequest>(`/repos/${owner}/${repo}/pulls/${String(number)}`);
    },

    async reviewPr({ owner, repo, number, body, event }) {
      return await post<PullRequestReview>(
        `/repos/${owner}/${repo}/pulls/${String(number)}/reviews`,
        { body, event },
      );
    },

    async listIssues({ owner, repo, state = 'open' }) {
      return await get<Issue[]>(`/repos/${owner}/${repo}/issues?state=${state}&per_page=30`);
    },

    async createIssue({ owner, repo, title, body, labels, assignees }) {
      return await post<Issue>(`/repos/${owner}/${repo}/issues`, {
        title,
        body: body ?? '',
        labels: labels ?? [],
        assignees: assignees ?? [],
      });
    },

    async getNotifications({ all = false } = {}) {
      return await get<Notification[]>(`/notifications?all=${String(all)}&per_page=50`);
    },

    async watchRepo({ owner, repo }) {
      return await put<{ subscribed: boolean }>(`/repos/${owner}/${repo}/subscription`, {
        subscribed: true,
      });
    },
  };
}
