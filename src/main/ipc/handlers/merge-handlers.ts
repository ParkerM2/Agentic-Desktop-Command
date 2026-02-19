/**
 * Merge IPC handlers — thin layer between IPC router and merge service
 *
 * All merge operations are async (git commands).
 */

import type { MergeService } from '../../services/merge/merge-service';
import type { IpcRouter } from '../router';

export function registerMergeHandlers(router: IpcRouter, mergeService: MergeService): void {
  router.handle('merge.previewDiff', ({ repoPath, sourceBranch, targetBranch }) =>
    mergeService.previewDiff(repoPath, sourceBranch, targetBranch),
  );

  router.handle('merge.getFileDiff', ({ repoPath, sourceBranch, targetBranch, filePath }) =>
    mergeService.getFileDiff(repoPath, sourceBranch, targetBranch, filePath),
  );

  router.handle('merge.checkConflicts', ({ repoPath, sourceBranch, targetBranch }) =>
    mergeService.checkConflicts(repoPath, sourceBranch, targetBranch),
  );

  router.handle('merge.mergeBranch', ({ repoPath, sourceBranch, targetBranch }) =>
    mergeService.mergeBranch(repoPath, sourceBranch, targetBranch),
  );

  router.handle('merge.abort', ({ repoPath }) => mergeService.abortMerge(repoPath));
}
