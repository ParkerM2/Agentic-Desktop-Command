/**
 * Git IPC Contract
 *
 * Defines invoke channels for git status, branches, worktrees,
 * repo structure detection, commits, pushes, conflict resolution,
 * and PR creation.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  GitBranchSchema,
  GitCommitInputSchema,
  GitCommitOutputSchema,
  GitCreatePrInputSchema,
  GitCreatePrOutputSchema,
  GitPushInputSchema,
  GitPushOutputSchema,
  GitResolveConflictInputSchema,
  GitResolveConflictOutputSchema,
  GitStatusSchema,
  RepoStructureSchema,
  WorktreeSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

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
    output: SuccessResponseSchema,
  },
  'git.commit': {
    input: GitCommitInputSchema,
    output: GitCommitOutputSchema,
  },
  'git.push': {
    input: GitPushInputSchema,
    output: GitPushOutputSchema,
  },
  'git.resolveConflict': {
    input: GitResolveConflictInputSchema,
    output: GitResolveConflictOutputSchema,
  },
  'git.createPr': {
    input: GitCreatePrInputSchema,
    output: GitCreatePrOutputSchema,
  },
  'git.createWorktree': {
    input: z.object({ repoPath: z.string(), worktreePath: z.string(), branch: z.string() }),
    output: WorktreeSchema,
  },
  'git.removeWorktree': {
    input: z.object({ repoPath: z.string(), worktreePath: z.string() }),
    output: SuccessResponseSchema,
  },
  'git.listWorktrees': {
    input: z.object({ projectId: z.string() }),
    output: z.array(WorktreeSchema),
  },
  'git.detectStructure': {
    input: z.object({ repoPath: z.string() }),
    output: z.object({ structure: RepoStructureSchema }),
  },
  'git.getRemoteUrl': {
    input: z.object({ repoPath: z.string(), remote: z.string().optional() }),
    output: z.object({ url: z.string() }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const gitEvents = {
  'event:git.worktreeChanged': {
    payload: z.object({ projectId: z.string() }),
  },
} as const;
