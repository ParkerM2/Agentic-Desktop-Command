/**
 * App Update IPC handlers — check, download, install updates
 */

import { APP } from '@shared/ipc/app/channels';

import type { AppUpdateService } from "./app-update-service";
import type { IpcRouter } from '../../ipc/router';

export function registerAppUpdateHandlers(
  router: IpcRouter,
  appUpdateService: AppUpdateService,
): void {
  router.handle(APP.CHECK.UPDATES, () => Promise.resolve(appUpdateService.checkForUpdates()));

  router.handle(APP.DOWNLOAD.UPDATE, () => Promise.resolve(appUpdateService.downloadUpdate()));

  router.handle(APP.INSTALL.UPDATE, () => Promise.resolve(appUpdateService.quitAndInstall()));

  router.handle(APP.GET['UPDATE-STATUS'], () => Promise.resolve(appUpdateService.getStatus()));
}
