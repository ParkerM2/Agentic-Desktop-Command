/**
 * Visualization IPC handlers
 *
 * Thin wrappers that look up the project path then delegate to VisualizationService.
 * Service methods are synchronous — handlers wrap returns with Promise.resolve().
 */

import type { ProjectService } from '../../services/project/project-service';
import type { VisualizationService } from '../../services/visualization';
import type { IpcRouter } from '../router';

export function registerVisualizationHandlers(
  router: IpcRouter,
  visualizationService: VisualizationService,
  projectService: ProjectService,
): void {
  router.handle('visualization.getCodebaseGraph', ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (projectPath === undefined) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return Promise.resolve(visualizationService.getCodebaseGraph(projectPath));
  });

  router.handle('visualization.getAgentTeams', ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (projectPath === undefined) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return Promise.resolve(visualizationService.getAgentTeams(projectPath));
  });

  router.handle('visualization.getSessionLog', ({ projectId, feature, agentName, cursor }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (projectPath === undefined) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return Promise.resolve(
      visualizationService.getSessionLog({ projectPath, feature, agentName, cursor }),
    );
  });
}
