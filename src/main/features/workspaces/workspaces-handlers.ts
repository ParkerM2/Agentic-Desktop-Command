/**
 * Workspaces IPC handlers
 */

import { WORKSPACES } from '@shared/ipc/misc/workspaces.channels';

import type { IpcRouter } from '../../ipc/router';
import type { WorkspacesService } from './workspaces-service';

export function registerWorkspacesHandlers(
  router: IpcRouter,
  service: WorkspacesService,
): void {
  router.handle(WORKSPACES.LIST.ALL, () =>
    Promise.resolve(service.list()),
  );

  router.handle(WORKSPACES.CREATE.WORKSPACE, ({ name, description }) =>
    Promise.resolve(service.create({ name, description })),
  );

  router.handle(WORKSPACES.UPDATE.WORKSPACE, ({ id, name, description, hostDeviceId, settings }) =>
    Promise.resolve(service.update(id, { name, description, hostDeviceId, settings })),
  );

  router.handle(WORKSPACES.DELETE.WORKSPACE, ({ id }) =>
    Promise.resolve(service.delete(id)),
  );
}
