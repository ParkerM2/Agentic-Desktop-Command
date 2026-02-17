/**
 * Git IPC Schemas
 *
 * Zod schemas for git status, branches, worktrees, and repo detection.
 */

import { z } from 'zod';

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
