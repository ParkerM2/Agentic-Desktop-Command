/**
 * Files IPC handlers — proxies to FileTreeService
 */

import type { FileTreeService } from '../../services/file-tree/file-tree-service';
import type { IpcRouter } from '../router';

export function registerFilesHandlers(
  router: IpcRouter,
  fileTreeService: FileTreeService,
): void {
  router.handle('files.listTree', ({ path }) =>
    Promise.resolve(fileTreeService.listTree(path)),
  );
}
