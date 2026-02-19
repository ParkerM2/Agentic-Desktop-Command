/**
 * Merge Service — Worktree merge workflow
 *
 * Handles merging worktree branches back to the target branch,
 * diff preview, and conflict detection via simple-git.
 */

import { existsSync } from 'node:fs';

import simpleGit from 'simple-git';

import type { MergeResult } from '@shared/types';

export interface MergeDiffFile {
  file: string;
  insertions: number;
  deletions: number;
  binary: boolean;
}

export interface MergeDiffSummary {
  files: MergeDiffFile[];
  insertions: number;
  deletions: number;
  changedFiles: number;
}

export interface MergeService {
  /** Preview changes between two branches */
  previewDiff: (
    repoPath: string,
    sourceBranch: string,
    targetBranch: string,
  ) => Promise<MergeDiffSummary>;
  /** Get raw unified diff for a single file between two branches */
  getFileDiff: (
    repoPath: string,
    sourceBranch: string,
    targetBranch: string,
    filePath: string,
  ) => Promise<{ diff: string; filePath: string }>;
  /** Check if a merge would have conflicts without actually merging */
  checkConflicts: (
    repoPath: string,
    sourceBranch: string,
    targetBranch: string,
  ) => Promise<string[]>;
  /** Merge source branch into target branch */
  mergeBranch: (
    repoPath: string,
    sourceBranch: string,
    targetBranch: string,
  ) => Promise<MergeResult>;
  /** Abort an in-progress merge */
  abortMerge: (repoPath: string) => Promise<{ success: boolean }>;
}

function validateRepoPath(repoPath: string): void {
  if (!existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }
}

export function createMergeService(): MergeService {
  return {
    async previewDiff(repoPath, sourceBranch, targetBranch) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);

      const diffSummary = await git.diffSummary([`${targetBranch}...${sourceBranch}`]);

      return {
        files: diffSummary.files.map((f) => ({
          file: f.file,
          insertions: 'insertions' in f ? f.insertions : 0,
          deletions: 'deletions' in f ? f.deletions : 0,
          binary: f.binary,
        })),
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        changedFiles: diffSummary.changed,
      };
    },

    async getFileDiff(repoPath, sourceBranch, targetBranch, filePath) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      const diff = await git.diff([`${targetBranch}...${sourceBranch}`, '--', filePath]);
      return { diff, filePath };
    },

    async checkConflicts(repoPath, sourceBranch, targetBranch) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);

      // Use merge-tree to detect conflicts without modifying the working tree
      try {
        const mergeBase = await git.raw(['merge-base', targetBranch, sourceBranch]);
        const result = await git.raw(['merge-tree', mergeBase.trim(), targetBranch, sourceBranch]);

        // Parse conflict markers from merge-tree output
        const conflicts: string[] = [];
        const conflictPattern = /^<<<<<< /gm;
        const lines = result.split('\n');
        let currentFile = '';

        for (const line of lines) {
          if (line.startsWith('changed in both')) {
            const match = /changed in both\s+'(.+?)'/.exec(line);
            if (match?.[1]) {
              currentFile = match[1];
            }
          }
          if (conflictPattern.test(line) && currentFile) {
            conflicts.push(currentFile);
            currentFile = '';
          }
        }

        return conflicts;
      } catch {
        return [];
      }
    },

    async mergeBranch(repoPath, sourceBranch, targetBranch) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);

      // Ensure we're on the target branch
      await git.checkout(targetBranch);

      try {
        const mergeResult = await git.merge([sourceBranch, '--no-ff']);

        return {
          success: mergeResult.result === 'success',
          message:
            mergeResult.result === 'success'
              ? `Successfully merged ${sourceBranch} into ${targetBranch}`
              : `Merge completed with status: ${mergeResult.result}`,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown merge error';
        const isConflict = msg.includes('CONFLICT') || msg.includes('conflict');

        if (isConflict) {
          // Get list of conflicted files
          const status = await git.status();
          return {
            success: false,
            conflicts: status.conflicted,
            message: `Merge conflicts detected in ${String(status.conflicted.length)} file(s)`,
          };
        }

        return {
          success: false,
          message: msg,
        };
      }
    },

    async abortMerge(repoPath) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      await git.merge(['--abort']);
      return { success: true };
    },
  };
}
