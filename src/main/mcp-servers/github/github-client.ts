/**
 * GitHub CLI Client
 *
 * Wraps the `gh` CLI tool for GitHub API access.
 * Uses `gh api` subprocess calls via child_process.execFile (no shell injection).
 * Auth is handled natively by `gh auth` — no API tokens needed.
 */

import { execFile } from 'node:child_process';

import type { Issue, Notification, PullRequest, PullRequestReview } from './types';

// ── Types ────────────────────────────────────────────────────

export interface GitHubAuthStatus {
  installed: boolean;
  authenticated: boolean;
  username: string | null;
  scopes: string[];
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  description: string | null;
  url: string;
  updatedAt: string;
}

export interface GitHubClient {
  /** Check gh CLI installation and auth status */
  getAuthStatus: () => Promise<GitHubAuthStatus>;

  /** List repositories for the authenticated user */
  getRepos: (params?: { limit?: number }) => Promise<GitHubRepo[]>;

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

// ── Errors ───────────────────────────────────────────────────

export class GitHubCliNotInstalledError extends Error {
  constructor() {
    super('GitHub CLI (gh) is not installed or not in PATH');
    this.name = 'GitHubCliNotInstalledError';
  }
}

export class GitHubCliNotAuthenticatedError extends Error {
  constructor() {
    super('GitHub CLI (gh) is not authenticated. Run `gh auth login` to authenticate.');
    this.name = 'GitHubCliNotAuthenticatedError';
  }
}

export class GitHubCliApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubCliApiError';
  }
}

// ── Helpers ──────────────────────────────────────────────────

const GH_TIMEOUT_MS = 30_000;

/** Run a gh CLI command and return stdout. Uses execFile to avoid shell injection. */
function runGh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gh', args, { timeout: GH_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) {
        const msg = stderr.trim() || stdout.trim() || error.message;

        // Distinguish "gh not found" from other errors
        if ('code' in error && error.code === 'ENOENT') {
          reject(new GitHubCliNotInstalledError());
          return;
        }

        reject(new GitHubCliApiError(msg));
        return;
      }

      resolve(stdout);
    });
  });
}

/** Run `gh api` with JSON output and parse the result. */
async function ghApi<T>(endpoint: string, method = 'GET', body?: Record<string, unknown>): Promise<T> {
  const args = ['api', endpoint, '--method', method];

  if (body !== undefined) {
    for (const [key, value] of Object.entries(body)) {
      args.push('-f', `${key}=${String(value)}`);
    }
  }

  const stdout = await runGh(args);

  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new GitHubCliApiError(`Failed to parse gh api response: ${stdout.slice(0, 200)}`);
  }
}

/** Run `gh api` with a raw JSON body (for POST with complex payloads). */
async function ghApiRawBody<T>(endpoint: string, method: string, body: Record<string, unknown>): Promise<T> {
  const args = ['api', endpoint, '--method', method, '--input', '-'];

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = execFile('gh', args, { timeout: GH_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, out, stderr) => {
      if (error !== null) {
        const msg = stderr.trim() || out.trim() || error.message;
        if ('code' in error && error.code === 'ENOENT') {
          reject(new GitHubCliNotInstalledError());
          return;
        }
        reject(new GitHubCliApiError(msg));
        return;
      }
      resolve(out);
    });

    if (child.stdin !== null) {
      child.stdin.write(JSON.stringify(body));
      child.stdin.end();
    }
  });

  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new GitHubCliApiError(`Failed to parse gh api response: ${stdout.slice(0, 200)}`);
  }
}

// ── Raw GitHub API response types (for gh api JSON output) ───

interface GhApiRepo {
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  updated_at: string;
}

// ── Factory ──────────────────────────────────────────────────

export function createGitHubCliClient(): GitHubClient {
  return {
    async getAuthStatus() {
      try {
        const stdout = await runGh(['auth', 'status']);
        // gh auth status outputs to stdout on success
        // Parse username and scopes from the output
        const usernameMatch = /Logged in to github\.com account (\S+)/i.exec(stdout)
          ?? /account (\S+)/i.exec(stdout);
        const scopesMatch = /Token scopes: (.+)/i.exec(stdout);

        const username = usernameMatch?.[1] ?? null;
        const scopes = scopesMatch?.[1]
          ?.split(',')
          .map((s) => s.trim().replaceAll(/^'|'$/g, ''))
          .filter((s) => s.length > 0) ?? [];

        return {
          installed: true,
          authenticated: true,
          username,
          scopes,
        };
      } catch (error: unknown) {
        if (error instanceof GitHubCliNotInstalledError) {
          return { installed: false, authenticated: false, username: null, scopes: [] };
        }
        // gh auth status exits non-zero when not authenticated
        return { installed: true, authenticated: false, username: null, scopes: [] };
      }
    },

    async getRepos({ limit = 30 } = {}) {
      const raw = await ghApi<GhApiRepo[]>(
        `/user/repos?per_page=${String(limit)}&sort=updated&type=owner`,
      );

      return raw.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        description: r.description,
        url: r.html_url,
        updatedAt: r.updated_at,
      }));
    },

    async listPrs({ owner, repo, state = 'open' }) {
      return await ghApi<PullRequest[]>(
        `/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`,
      );
    },

    async getPr({ owner, repo, number }) {
      return await ghApi<PullRequest>(
        `/repos/${owner}/${repo}/pulls/${String(number)}`,
      );
    },

    async reviewPr({ owner, repo, number, body, event }) {
      return await ghApiRawBody<PullRequestReview>(
        `/repos/${owner}/${repo}/pulls/${String(number)}/reviews`,
        'POST',
        { body, event },
      );
    },

    async listIssues({ owner, repo, state = 'open' }) {
      return await ghApi<Issue[]>(
        `/repos/${owner}/${repo}/issues?state=${state}&per_page=30`,
      );
    },

    async createIssue({ owner, repo, title, body, labels, assignees }) {
      return await ghApiRawBody<Issue>(
        `/repos/${owner}/${repo}/issues`,
        'POST',
        {
          title,
          body: body ?? '',
          labels: labels ?? [],
          assignees: assignees ?? [],
        },
      );
    },

    async getNotifications({ all = false } = {}) {
      return await ghApi<Notification[]>(
        `/notifications?all=${String(all)}&per_page=50`,
      );
    },

    async watchRepo({ owner, repo }) {
      return await ghApiRawBody<{ subscribed: boolean }>(
        `/repos/${owner}/${repo}/subscription`,
        'PUT',
        { subscribed: true },
      );
    },
  };
}
