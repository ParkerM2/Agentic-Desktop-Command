/**
 * Project IPC handlers — thin layer between IPC router and project service
 */

import type { ProjectService } from '../../services/project/project-service';
import type { IpcRouter } from '../router';

export function registerProjectHandlers(router: IpcRouter, service: ProjectService): void {
  router.handle('projects.list', () => Promise.resolve(service.listProjects()));

  router.handle('projects.add', ({ path }) => Promise.resolve(service.addProject(path)));

  router.handle('projects.remove', ({ projectId }) =>
    Promise.resolve(service.removeProject(projectId)),
  );

  router.handle('projects.initialize', ({ projectId }) =>
    Promise.resolve(service.initializeProject(projectId)),
  );

  router.handle('projects.selectDirectory', async () => {
    return await service.selectDirectory();
  });
}
