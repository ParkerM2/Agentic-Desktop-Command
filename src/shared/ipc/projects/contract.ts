/**
 * Projects IPC Contract
 *
 * Invoke and event channel definitions for project CRUD, sub-projects,
 * git operations (status, branches, worktrees), and merge operations.
 */

import { z } from 'zod';

import {
  GitBranchSchema,
  GitStatusSchema,
  MergeDiffSummarySchema,
  MergeResultSchema,
  ProjectSchema,
  RepoDetectionResultSchema,
  RepoStructureSchema,
  SubProjectSchema,
  WorktreeSchema,
} from './schemas';

/** Invoke channels for project operations */
export const projectsInvoke = {
  'projects.list': {
    input: z.object({}),
    output: z.array(ProjectSchema),
  },
  'projects.add': {
    input: z.object({ path: z.string() }),
    output: ProjectSchema,
  },
  'projects.remove': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'projects.initialize': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'projects.selectDirectory': {
    input: z.object({}),
    output: z.object({ path: z.string().nullable() }),
  },
  'projects.detectRepo': {
    input: z.object({ path: z.string() }),
    output: RepoDetectionResultSchema,
  },
  'projects.update': {
    input: z.object({
      projectId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
    }),
    output: ProjectSchema,
  },
  'projects.getSubProjects': {
    input: z.object({ projectId: z.string() }),
    output: z.array(SubProjectSchema),
  },
  'projects.createSubProject': {
    input: z.object({
      projectId: z.string(),
      name: z.string(),
      relativePath: z.string(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
    }),
    output: SubProjectSchema,
  },
  'projects.deleteSubProject': {
    input: z.object({ projectId: z.string(), subProjectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for git operations */
export const gitInvoke = {
  'git.status': {
    input: z.object({ repoPath: z.string() }),
    output: GitStatusSchema,
  },
  'git.branches': {
    input: z.object({ repoPath: z.string() }),
    output: z.array(GitBranchSchema),
  },
  'git.createBranch': {
    input: z.object({
      repoPath: z.string(),
      branchName: z.string(),
      baseBranch: z.string().optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'git.createWorktree': {
    input: z.object({ repoPath: z.string(), worktreePath: z.string(), branch: z.string() }),
    output: WorktreeSchema,
  },
  'git.removeWorktree': {
    input: z.object({ repoPath: z.string(), worktreePath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'git.listWorktrees': {
    input: z.object({ projectId: z.string() }),
    output: z.array(WorktreeSchema),
  },
  'git.detectStructure': {
    input: z.object({ repoPath: z.string() }),
    output: z.object({ structure: RepoStructureSchema }),
  },
} as const;

/** Invoke channels for merge operations */
export const mergeInvoke = {
  'merge.previewDiff': {
    input: z.object({
      repoPath: z.string(),
      sourceBranch: z.string(),
      targetBranch: z.string(),
    }),
    output: MergeDiffSummarySchema,
  },
  'merge.checkConflicts': {
    input: z.object({
      repoPath: z.string(),
      sourceBranch: z.string(),
      targetBranch: z.string(),
    }),
    output: z.array(z.string()),
  },
  'merge.mergeBranch': {
    input: z.object({
      repoPath: z.string(),
      sourceBranch: z.string(),
      targetBranch: z.string(),
    }),
    output: MergeResultSchema,
  },
  'merge.abort': {
    input: z.object({ repoPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Event channels for project-related events */
export const projectsEvents = {
  'event:project.updated': {
    payload: z.object({ projectId: z.string() }),
  },
  'event:git.worktreeChanged': {
    payload: z.object({ projectId: z.string() }),
  },
} as const;
