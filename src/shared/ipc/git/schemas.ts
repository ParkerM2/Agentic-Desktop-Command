/**
 * Git IPC Schemas
 *
 * Zod schemas for git status, branches, worktrees, repo detection,
 * commits, pushes, conflict resolution, and PR creation.
 */

import { z } from 'zod';

// ── Status & Branch Schemas ─────────────────────────────────────

export const GitStatusSchema = z.object({
  branch: z.string(),
  isClean: z.boolean(),
  ahead: z.number(),
  behind: z.number(),
  staged: z.array(z.string()),
  modified: z.array(z.string()),
  untracked: z.array(z.string()),
});

export const GitBranchSchema = z.object({
  name: z.string(),
  current: z.boolean(),
  remote: z.string().optional(),
  lastCommit: z.string().optional(),
});

// ── Worktree Schemas ────────────────────────────────────────────

export const WorktreeSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  subprojectId: z.string().optional(),
  path: z.string(),
  branch: z.string(),
  taskId: z.string().optional(),
  createdAt: z.string(),
});

export const RepoStructureSchema = z.enum(['single', 'monorepo', 'polyrepo']);

// ── Commit History Schema ───────────────────────────────────────

export const GitCommitSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  message: z.string(),
  author: z.string(),
  authorEmail: z.string(),
  date: z.string(), // ISO 8601
});

export type GitCommit = z.infer<typeof GitCommitSchema>;

// ── Commit Schemas ──────────────────────────────────────────────

export const GitCommitInputSchema = z.object({
  projectPath: z.string(),
  message: z.string(),
  files: z.array(z.string()).optional(),
});

export const GitCommitOutputSchema = z.object({
  hash: z.string(),
  message: z.string(),
});

// ── Push Schemas ────────────────────────────────────────────────

export const GitPushInputSchema = z.object({
  projectPath: z.string(),
  remote: z.string().optional(),
  branch: z.string().optional(),
});

export const GitPushOutputSchema = z.object({
  success: z.boolean(),
  remote: z.string(),
  branch: z.string(),
});

// ── Conflict Resolution Schemas ─────────────────────────────────

export const GitConflictStrategySchema = z.enum(['ours', 'theirs']);

export const GitResolveConflictInputSchema = z.object({
  projectPath: z.string(),
  filePath: z.string(),
  strategy: GitConflictStrategySchema,
});

export const GitResolveConflictOutputSchema = z.object({
  success: z.boolean(),
  filePath: z.string(),
});

// ── PR Creation Schemas ─────────────────────────────────────────

export const GitCreatePrInputSchema = z.object({
  projectPath: z.string(),
  title: z.string(),
  body: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
});

export const GitCreatePrOutputSchema = z.object({
  url: z.string(),
  number: z.number(),
  title: z.string(),
});
