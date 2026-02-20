/**
 * GitHub IPC handlers
 */

import type { GitHubService } from '../../services/github/github-service';
import type { IpcRouter } from '../router';

export function registerGitHubHandlers(router: IpcRouter, service: GitHubService): void {
  router.handle('github.authStatus', async () => {
    return await service.getAuthStatus();
  });

  router.handle('github.getRepos', async (params) => {
    return await service.getRepos(params);
  });

  router.handle('github.listPrs', async (params) => {
    return await service.listPrs(params);
  });

  router.handle('github.getPr', async (params) => {
    return await service.getPr(params);
  });

  router.handle('github.listIssues', async (params) => {
    return await service.listIssues(params);
  });

  router.handle('github.createIssue', async (params) => {
    return await service.createIssue(params);
  });

  router.handle('github.getNotifications', async (params) => {
    return await service.getNotifications(params);
  });
}
