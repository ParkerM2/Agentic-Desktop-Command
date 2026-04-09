/**
 * Git IPC Contract
 *
 * Defines invoke channels for git status, branches, worktrees,
 * repo structure detection, commits, pushes, conflict resolution,
 * and PR creation.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { GIT, GIT_EVENTS } from './channels';
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
  [GIT.GET.STATUS]: {
    input: z.object({ repoPath: z.string() }),
    output: GitStatusSchema,
  },
  [GIT.GET.BRANCHES]: {
    input: z.object({ repoPath: z.string() }),
    output: z.array(GitBranchSchema),
  },
  [GIT.CREATE.BRANCH]: {
    input: z.object({
      repoPath: z.string(),
      branchName: z.string(),
      baseBranch: z.string().optional(),
    }),
    output: SuccessResponseSchema,
  },
  [GIT.COMMIT.CHANGES]: {
    input: GitCommitInputSchema,
    output: GitCommitOutputSchema,
  },
  [GIT.PUSH.CHANGES]: {
    input: GitPushInputSchema,
    output: GitPushOutputSchema,
  },
  [GIT.RESOLVE.CONFLICT]: {
    input: GitResolveConflictInputSchema,
    output: GitResolveConflictOutputSchema,
  },
  [GIT.CREATE.PR]: {
    input: GitCreatePrInputSchema,
    output: GitCreatePrOutputSchema,
  },
  [GIT.CREATE.WORKTREE]: {
    input: z.object({ repoPath: z.string(), worktreePath: z.string(), branch: z.string() }),
    output: WorktreeSchema,
  },
  [GIT.REMOVE.WORKTREE]: {
    input: z.object({ repoPath: z.string(), worktreePath: z.string() }),
    output: SuccessResponseSchema,
  },
  [GIT.LIST.WORKTREES]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(WorktreeSchema),
  },
  [GIT.DETECT.STRUCTURE]: {
    input: z.object({ repoPath: z.string() }),
    output: z.object({ structure: RepoStructureSchema }),
  },
  [GIT.GET['REMOTE-URL']]: {
    input: z.object({ repoPath: z.string(), remote: z.string().optional() }),
    output: z.object({ url: z.string() }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const gitEvents = {
  [GIT_EVENTS.WORKTREE.CHANGED]: {
    payload: z.object({ projectId: z.string() }),
  },
} as const;
