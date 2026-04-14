/**
 * GitHub IPC Contract
 *
 * Defines invoke channels for GitHub PR, issue, and notification access.
 */

import { z } from 'zod';

import { GITHUB, GITHUB_EVENTS } from './channels';
import {
  GitHubAuthStatusSchema,
  GitHubIssueSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
  GitHubRepoSchema,
  PrDiffFileSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const githubInvoke = {
  [GITHUB.LIST.PRS]: {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubPullRequestSchema),
  },
  [GITHUB.GET.PR]: {
    input: z.object({ owner: z.string(), repo: z.string(), number: z.number() }),
    output: GitHubPullRequestSchema,
  },
  [GITHUB.GET.PR_FILES]: {
    input: z.object({ owner: z.string(), repo: z.string(), number: z.number() }),
    output: z.array(PrDiffFileSchema),
  },
  [GITHUB.LIST.ISSUES]: {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubIssueSchema),
  },
  [GITHUB.CREATE.ISSUE]: {
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
  [GITHUB.GET.NOTIFICATIONS]: {
    input: z.object({ all: z.boolean().optional() }),
    output: z.array(GitHubNotificationSchema),
  },
  [GITHUB.GET['AUTH-STATUS']]: {
    input: z.object({}),
    output: GitHubAuthStatusSchema,
  },
  [GITHUB.LIST.REPOS]: {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(GitHubRepoSchema),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const githubEvents = {
  [GITHUB_EVENTS.DATA.UPDATED]: {
    payload: z.object({
      type: z.enum(['pr', 'issue', 'notification']),
      owner: z.string(),
      repo: z.string(),
    }),
  },
} as const;
