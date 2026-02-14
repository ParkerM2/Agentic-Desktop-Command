/**
 * App Update IPC handlers — check, download, install updates
 */

import type { AppUpdateService } from '../../services/app/app-update-service';
import type { IpcRouter } from '../router';

export function registerAppUpdateHandlers(
  router: IpcRouter,
  appUpdateService: AppUpdateService,
): void {
  router.handle('app.checkForUpdates', () => Promise.resolve(appUpdateService.checkForUpdates()));

  router.handle('app.downloadUpdate', () => Promise.resolve(appUpdateService.downloadUpdate()));

  router.handle('app.quitAndInstall', () => Promise.resolve(appUpdateService.quitAndInstall()));

  router.handle('app.getUpdateStatus', () => Promise.resolve(appUpdateService.getStatus()));
}
