/**
 * Task handlers barrel — re-exports the combined registerTaskHandlers().
 */

import { registerHubTaskHandlers } from './hub-task-handlers';
import { registerLegacyTaskHandlers } from './legacy-task-handlers';


import type { GithubTaskImporter } from './github-importer';
import type { TaskDecomposer } from './task-decomposer';
import type { TaskRepository } from './types';
import type { IpcRouter } from '../../ipc/router';

export interface TaskHandlerDeps {
  taskRepository: TaskRepository;
  taskDecomposer?: TaskDecomposer;
  githubImporter?: GithubTaskImporter;
}

export function registerTaskHandlers(
  router: IpcRouter,
  taskRepository: TaskRepository,
  taskDecomposer?: TaskDecomposer,
  githubImporter?: GithubTaskImporter,
): void {
  registerHubTaskHandlers(router, taskRepository);
  registerLegacyTaskHandlers(router, taskRepository, taskDecomposer, githubImporter);
}
