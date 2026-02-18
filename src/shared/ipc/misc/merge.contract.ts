/**
 * Merge IPC Contract
 *
 * Invoke channels for branch merge operations: diff preview,
 * conflict checking, merge execution, and abort.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

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

export const MergeResultSchema = z.object({
  success: z.boolean(),
  conflicts: z.array(z.string()).optional(),
  message: z.string(),
});

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
    output: SuccessResponseSchema,
  },
} as const;
