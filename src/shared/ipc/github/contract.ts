/**
 * GitHub IPC Contract
 *
 * Defines invoke channels for GitHub PR, issue, and notification access.
 */

import { z } from 'zod';

import {
  GitHubAuthStatusSchema,
  GitHubIssueSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
  GitHubRepoSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const githubInvoke = {
  'github.listPrs': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubPullRequestSchema),
  },
  'github.getPr': {
    input: z.object({ owner: z.string(), repo: z.string(), number: z.number() }),
    output: GitHubPullRequestSchema,
  },
  'github.listIssues': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubIssueSchema),
  },
  'github.createIssue': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
    }),
    output: GitHubIssueSchema,
  },
  'github.getNotifications': {
    input: z.object({ all: z.boolean().optional() }),
    output: z.array(GitHubNotificationSchema),
  },
  'github.authStatus': {
    input: z.object({}),
    output: GitHubAuthStatusSchema,
  },
  'github.getRepos': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(GitHubRepoSchema),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const githubEvents = {
  'event:github.updated': {
    payload: z.object({
      type: z.enum(['pr', 'issue', 'notification']),
      owner: z.string(),
      repo: z.string(),
    }),
  },
} as const;
