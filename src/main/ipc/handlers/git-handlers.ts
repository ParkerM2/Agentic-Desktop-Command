/**
 * Git IPC handlers — thin layer between IPC router and git services
 *
 * NOTE: Git service methods are async (unlike most services),
 * so handlers return the async result directly instead of wrapping in Promise.resolve().
 */

import { GIT, GIT_EVENTS } from '@shared/ipc/git/channels';

import type { GitService } from '../../services/git/git-service';
import type { WorktreeService } from '../../services/git/worktree-service';
import type { IpcRouter } from '../router';

export function registerGitHandlers(
  router: IpcRouter,
  gitService: GitService,
  worktreeService: WorktreeService,
): void {
  router.handle(GIT.GET.STATUS, ({ repoPath }) => gitService.getStatus(repoPath));

  router.handle(GIT.GET.BRANCHES, ({ repoPath }) => gitService.listBranches(repoPath));

  router.handle(GIT.CREATE.BRANCH, ({ repoPath, branchName, baseBranch }) =>
    gitService.createBranch(repoPath, branchName, baseBranch),
  );

  router.handle(GIT.CREATE.WORKTREE, async ({ repoPath, worktreePath, branch }) => {
    const result = await worktreeService.createWorktree(repoPath, worktreePath, branch);
    router.emit(GIT_EVENTS.WORKTREE.CHANGED, { projectId: repoPath });
    return result;
  });

  router.handle(GIT.REMOVE.WORKTREE, async ({ repoPath, worktreePath }) => {
    const result = await worktreeService.removeWorktree(repoPath, worktreePath);
    router.emit(GIT_EVENTS.WORKTREE.CHANGED, { projectId: repoPath });
    return result;
  });

  router.handle(GIT.LIST.WORKTREES, ({ projectId }) =>
    Promise.resolve(worktreeService.listWorktrees(projectId)),
  );

  router.handle(GIT.DETECT.STRUCTURE, async ({ repoPath }) => {
    const structure = await gitService.detectStructure(repoPath);
    return { structure };
  });

  router.handle(GIT.COMMIT.CHANGES, ({ projectPath, message, files }) =>
    gitService.commit(projectPath, message, files),
  );

  router.handle(GIT.PUSH.CHANGES, ({ projectPath, remote, branch }) =>
    gitService.push(projectPath, remote, branch),
  );

  router.handle(GIT.RESOLVE.CONFLICT, ({ projectPath, filePath, strategy }) =>
    gitService.resolveConflict(projectPath, filePath, strategy),
  );

  router.handle(GIT.CREATE.PR, ({ projectPath, title, body, baseBranch, headBranch }) =>
    gitService.createPr(projectPath, title, body, baseBranch, headBranch),
  );

  router.handle(GIT.GET['REMOTE-URL'], async ({ repoPath, remote }) => {
    const url = await gitService.getRemoteUrl(repoPath, remote);
    return { url };
  });
}
