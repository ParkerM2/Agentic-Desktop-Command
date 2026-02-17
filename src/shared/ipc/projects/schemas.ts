/**
 * Projects IPC Schemas
 *
 * Zod schemas for project-related IPC channels including project CRUD,
 * sub-projects, repo detection, git operations, merge operations,
 * and worktree management.
 */

import { z } from 'zod';

// ── Project Schemas ─────────────────────────────────────────────

export const RepoTypeSchema = z.enum(['single', 'monorepo', 'multi-repo', 'none']);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  autoBuildPath: z.string().optional(),
  workspaceId: z.string().optional(),
  gitUrl: z.string().optional(),
  repoStructure: RepoTypeSchema.optional(),
  defaultBranch: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SubProjectSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  relativePath: z.string(),
  gitUrl: z.string().optional(),
  defaultBranch: z.string(),
  createdAt: z.string(),
});

// ── Repo Detection Schemas ──────────────────────────────────────

export const ChildRepoSchema = z.object({
  name: z.string(),
  path: z.string(),
  relativePath: z.string(),
  gitUrl: z.string().optional(),
});

export const RepoDetectionResultSchema = z.object({
  isGitRepo: z.boolean(),
  repoType: RepoTypeSchema,
  gitUrl: z.string().optional(),
  defaultBranch: z.string().optional(),
  childRepos: z.array(ChildRepoSchema),
});

// ── Git Schemas ─────────────────────────────────────────────────

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

// ── Merge Schemas ───────────────────────────────────────────────

export const MergeResultSchema = z.object({
  success: z.boolean(),
  conflicts: z.array(z.string()).optional(),
  message: z.string(),
});

export const MergeDiffFileSchema = z.object({
  file: z.string(),
  insertions: z.number(),
  deletions: z.number(),
  binary: z.boolean(),
});

export const MergeDiffSummarySchema = z.object({
  files: z.array(MergeDiffFileSchema),
  insertions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});
