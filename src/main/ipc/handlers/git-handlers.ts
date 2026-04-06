/**
 * Git IPC handlers — thin layer between IPC router and git services
 *
 * NOTE: Git service methods are async (unlike most services),
 * so handlers return the async result directly instead of wrapping in Promise.resolve().
 */

import type { GitService } from '../../services/git/git-service';
import type { WorktreeService } from '../../services/git/worktree-service';
import type { IpcRouter } from '../router';

export function registerGitHandlers(
  router: IpcRouter,
  gitService: GitService,
  worktreeService: WorktreeService,
): void {
  router.handle('git.status', ({ repoPath }) => gitService.getStatus(repoPath));

  router.handle('git.branches', ({ repoPath }) => gitService.listBranches(repoPath));

  router.handle('git.createBranch', ({ repoPath, branchName, baseBranch }) =>
    gitService.createBranch(repoPath, branchName, baseBranch),
  );

  router.handle('git.createWorktree', async ({ repoPath, worktreePath, branch }) => {
    const result = await worktreeService.createWorktree(repoPath, worktreePath, branch);
    router.emit('event:git.worktreeChanged', { projectId: repoPath });
    return result;
  });

  router.handle('git.removeWorktree', async ({ repoPath, worktreePath }) => {
    const result = await worktreeService.removeWorktree(repoPath, worktreePath);
    router.emit('event:git.worktreeChanged', { projectId: repoPath });
    return result;
  });

  router.handle('git.listWorktrees', ({ projectId }) =>
    Promise.resolve(worktreeService.listWorktrees(projectId)),
  );

  router.handle('git.detectStructure', async ({ repoPath }) => {
    const structure = await gitService.detectStructure(repoPath);
    return { structure };
  });

  router.handle('git.commit', ({ projectPath, message, files }) =>
    gitService.commit(projectPath, message, files),
  );

  router.handle('git.push', ({ projectPath, remote, branch }) =>
    gitService.push(projectPath, remote, branch),
  );

  router.handle('git.resolveConflict', ({ projectPath, filePath, strategy }) =>
    gitService.resolveConflict(projectPath, filePath, strategy),
  );

  router.handle('git.createPr', ({ projectPath, title, body, baseBranch, headBranch }) =>
    gitService.createPr(projectPath, title, body, baseBranch, headBranch),
  );

  router.handle('git.getRemoteUrl', async ({ repoPath, remote }) => {
    const url = await gitService.getRemoteUrl(repoPath, remote);
    return { url };
  });
}
