/**
 * GitHub IPC Schemas
 *
 * Zod schemas for GitHub pull requests, issues, and notifications.
 */

import { z } from 'zod';

export const GitHubLabelSchema = z.object({
  name: z.string(),
  color: z.string(),
});

export const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed']),
  merged: z.boolean(),
  draft: z.boolean(),
  author: z.string(),
  authorAvatar: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  labels: z.array(GitHubLabelSchema),
  reviewers: z.array(z.string()),
  comments: z.number(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});

export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed']),
  author: z.string(),
  authorAvatar: z.string(),
  url: z.string(),
  labels: z.array(GitHubLabelSchema),
  assignees: z.array(z.string()),
  comments: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GitHubNotificationSchema = z.object({
  id: z.string(),
  unread: z.boolean(),
  reason: z.string(),
  title: z.string(),
  type: z.string(),
  repoName: z.string(),
  updatedAt: z.string(),
});

export const GitHubAuthStatusSchema = z.object({
  installed: z.boolean(),
  authenticated: z.boolean(),
  username: z.string().nullable(),
  scopes: z.array(z.string()),
});

export const GitHubRepoSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  isPrivate: z.boolean(),
  defaultBranch: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  updatedAt: z.string(),
});
