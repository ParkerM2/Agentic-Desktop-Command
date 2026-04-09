/**
 * Files IPC handlers — proxies to FileTreeService
 */

import { FILES } from '@shared/ipc/files/channels';

import type { FileTreeService } from '../../services/file-tree/file-tree-service';
import type { IpcRouter } from '../router';

export function registerFilesHandlers(
  router: IpcRouter,
  fileTreeService: FileTreeService,
): void {
  router.handle(FILES.LIST.TREE, ({ path }) =>
    Promise.resolve(fileTreeService.listTree(path)),
  );
}
