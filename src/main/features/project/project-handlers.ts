/**
 * Project IPC handlers — proxies to Hub API via ProjectService
 */

import { PROJECTS } from '@shared/ipc/projects/channels';
import type { Project } from '@shared/types';

import { detectRepoStructure } from "./project-detector";

import type { CodebaseAnalyzerService } from "./codebase-analyzer";
import type { ProjectService } from "./project-service";
import type { SetupPipelineService } from "./setup-pipeline";
import type { IpcRouter } from '../../ipc/router';

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
  router.handle(PROJECTS.LIST.ALL, async () => {
    const projects = await service.listProjects();
    return projects.map((p) => transformHubProject(p as unknown as Record<string, unknown>));
  });

  router.handle(
    PROJECTS.ADD.PROJECT,
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

  router.handle(PROJECTS.REMOVE.PROJECT, async ({ projectId }) => {
    return await service.removeProject(projectId);
  });

  router.handle(PROJECTS.INITIALIZE.PROJECT, ({ projectId }) =>
    Promise.resolve(service.initializeProject(projectId)),
  );

  router.handle(PROJECTS.SELECT.DIRECTORY, async () => {
    return await service.selectDirectory();
  });

  router.handle(PROJECTS.DETECT.REPO, ({ path }) =>
    Promise.resolve(detectRepoStructure(path)),
  );

  router.handle(PROJECTS.UPDATE.PROJECT, async ({ projectId, ...updates }) => {
    const project = await service.updateProject({ projectId, ...updates });
    return transformHubProject(project as unknown as Record<string, unknown>);
  });

  router.handle(PROJECTS.GET['SUB-PROJECTS'], async ({ projectId }) => {
    return await service.getSubProjects(projectId);
  });

  router.handle(PROJECTS.CREATE['SUB-PROJECT'], async (input) => {
    return await service.createSubProject(input);
  });

  router.handle(PROJECTS.DELETE['SUB-PROJECT'], async ({ projectId, subProjectId }) => {
    return await service.deleteSubProject(projectId, subProjectId);
  });

  router.handle(PROJECTS.ANALYZE.CODEBASE, ({ path }) =>
    Promise.resolve(codebaseAnalyzer.analyzeCodebase(path)),
  );

  router.handle(PROJECTS.SETUP.EXISTING, ({ projectId }) => {
    void setupPipeline.runForExisting(projectId);
    return Promise.resolve({ success: true });
  });

  router.handle(PROJECTS.CREATE.NEW, async (input) => {
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
