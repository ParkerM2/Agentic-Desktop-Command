/**
 * GitHub IPC handlers.
 */

import { GITHUB } from '@shared/ipc/github/channels';

import type { GitHubService } from './github-service';
import type { IpcRouter } from '../../ipc/router';

export function registerGitHubHandlers(router: IpcRouter, service: GitHubService): void {
  router.handle(GITHUB.GET['AUTH-STATUS'], async () => {
    return await service.getAuthStatus();
  });

  router.handle(GITHUB.LIST.REPOS, async (params) => {
    return await service.getRepos(params);
  });

  router.handle(GITHUB.LIST.PRS, async (params) => {
    return await service.listPrs(params);
  });

  router.handle(GITHUB.GET.PR, async (params) => {
    return await service.getPr(params);
  });

  router.handle(GITHUB.GET.PR_FILES, async (params) => {
    return await service.getPrFiles(params);
  });

  router.handle(GITHUB.LIST.ISSUES, async (params) => {
    return await service.listIssues(params);
  });

  router.handle(GITHUB.CREATE.ISSUE, async (params) => {
    return await service.createIssue(params);
  });

  router.handle(GITHUB.GET.NOTIFICATIONS, async (params) => {
    return await service.getNotifications(params);
  });
}
