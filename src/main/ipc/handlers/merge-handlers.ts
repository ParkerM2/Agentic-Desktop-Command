/**
 * Merge IPC handlers — thin layer between IPC router and merge service
 *
 * All merge operations are async (git commands).
 */

import { MERGE } from '@shared/ipc/misc/merge.channels';

import type { MergeService } from '../../services/merge/merge-service';
import type { IpcRouter } from '../router';

export function registerMergeHandlers(router: IpcRouter, mergeService: MergeService): void {
  router.handle(MERGE.PREVIEW.DIFF, ({ repoPath, sourceBranch, targetBranch }) =>
    mergeService.previewDiff(repoPath, sourceBranch, targetBranch),
  );

  router.handle(MERGE.GET['FILE-DIFF'], ({ repoPath, sourceBranch, targetBranch, filePath }) =>
    mergeService.getFileDiff(repoPath, sourceBranch, targetBranch, filePath),
  );

  router.handle(MERGE.CHECK.CONFLICTS, ({ repoPath, sourceBranch, targetBranch }) =>
    mergeService.checkConflicts(repoPath, sourceBranch, targetBranch),
  );

  router.handle(MERGE.EXECUTE.MERGE, ({ repoPath, sourceBranch, targetBranch }) =>
    mergeService.mergeBranch(repoPath, sourceBranch, targetBranch),
  );

  router.handle(MERGE.ABORT.MERGE, ({ repoPath }) => mergeService.abortMerge(repoPath));
}
