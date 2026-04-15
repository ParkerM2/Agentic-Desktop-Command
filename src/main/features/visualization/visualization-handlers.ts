/**
 * Visualization IPC handlers
 *
 * Thin wrappers that look up the project path then delegate to VisualizationService.
 * Service methods are synchronous — handlers wrap returns with Promise.resolve().
 */

import { VISUALIZATION } from '@shared/ipc/visualization/channels';

import type { VisualizationService } from ".";
import type { IpcRouter } from '../../ipc/router';
import type { ProjectService } from "../projects/project-service";

export function registerVisualizationHandlers(
  router: IpcRouter,
  visualizationService: VisualizationService,
  projectService: ProjectService,
): void {
  router.handle(VISUALIZATION.GET['CODEBASE-GRAPH'], ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (projectPath === undefined) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return Promise.resolve(visualizationService.getCodebaseGraph(projectPath));
  });

  router.handle(VISUALIZATION.GET['AGENT-TEAMS'], ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (projectPath === undefined) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return Promise.resolve(visualizationService.getAgentTeams(projectPath));
  });

  router.handle(VISUALIZATION.GET['SESSION-LOG'], ({ projectId, feature, agentName, cursor }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (projectPath === undefined) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return Promise.resolve(
      visualizationService.getSessionLog({ projectPath, feature, agentName, cursor }),
    );
  });
}
