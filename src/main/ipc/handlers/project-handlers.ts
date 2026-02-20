/**
 * Project IPC handlers — proxies to Hub API via ProjectService
 */

import type { Project } from '@shared/types';

import { detectRepoStructure } from '../../services/project/project-detector';

import type { CodebaseAnalyzerService } from '../../services/project/codebase-analyzer';
import type { ProjectService } from '../../services/project/project-service';
import type { SetupPipelineService } from '../../services/project/setup-pipeline';
import type { IpcRouter } from '../router';

/**
 * Transform a Hub API project response to the local Project shape.
 * Hub returns `rootPath` while local code expects `path`.
 */
function transformHubProject(raw: Record<string, unknown>): Project {
  const path = (raw.rootPath as string | undefined) ?? (raw.path as string | undefined) ?? '';

  return {
    id: raw.id as string,
    name: raw.name as string,
    path,
    autoBuildPath: raw.autoBuildPath as string | undefined,
    workspaceId: raw.workspaceId as string | undefined,
    gitUrl: raw.gitUrl as string | undefined,
    repoStructure: raw.repoStructure as Project['repoStructure'],
    defaultBranch: raw.defaultBranch as string | undefined,
    description: raw.description as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

export function registerProjectHandlers(
  router: IpcRouter,
  service: ProjectService,
  codebaseAnalyzer: CodebaseAnalyzerService,
  setupPipeline: SetupPipelineService,
): void {
  router.handle('projects.list', async () => {
    const projects = await service.listProjects();
    return projects.map((p) => transformHubProject(p as unknown as Record<string, unknown>));
  });

  router.handle(
    'projects.add',
    async ({ path, name, workspaceId, description, repoStructure, defaultBranch }) => {
      const project = await service.addProject({
        path,
        name,
        workspaceId,
        description,
        repoStructure,
        defaultBranch,
      });
      return transformHubProject(project as unknown as Record<string, unknown>);
    },
  );

  router.handle('projects.remove', async ({ projectId }) => {
    return await service.removeProject(projectId);
  });

  router.handle('projects.initialize', ({ projectId }) =>
    Promise.resolve(service.initializeProject(projectId)),
  );

  router.handle('projects.selectDirectory', async () => {
    return await service.selectDirectory();
  });

  router.handle('projects.detectRepo', ({ path }) =>
    Promise.resolve(detectRepoStructure(path)),
  );

  router.handle('projects.update', async ({ projectId, ...updates }) => {
    const project = await service.updateProject({ projectId, ...updates });
    return transformHubProject(project as unknown as Record<string, unknown>);
  });

  router.handle('projects.getSubProjects', async ({ projectId }) => {
    return await service.getSubProjects(projectId);
  });

  router.handle('projects.createSubProject', async (input) => {
    return await service.createSubProject(input);
  });

  router.handle('projects.deleteSubProject', async ({ projectId, subProjectId }) => {
    return await service.deleteSubProject(projectId, subProjectId);
  });

  router.handle('projects.analyzeCodebase', ({ path }) =>
    Promise.resolve(codebaseAnalyzer.analyzeCodebase(path)),
  );

  router.handle('projects.setupExisting', ({ projectId }) => {
    void setupPipeline.runForExisting(projectId);
    return Promise.resolve({ success: true });
  });

  router.handle('projects.createNew', async (input) => {
    const project = await service.addProject({
      path: input.path,
      name: input.name,
      description: input.description,
      workspaceId: input.workspaceId,
    });
    void setupPipeline.runForNew({
      ...input,
      projectId: project.id,
    });
    return transformHubProject(project as unknown as Record<string, unknown>);
  });
}
