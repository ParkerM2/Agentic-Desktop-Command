/**
 * Task handlers barrel — re-exports the combined registerTaskHandlers().
 */

import { registerHubTaskHandlers } from './hub-task-handlers';
import { registerLegacyTaskHandlers } from './legacy-task-handlers';

import type { GithubTaskImporter } from '../../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../../services/tasks/task-decomposer';
import type { TaskRepository } from '../../../services/tasks/types';
import type { IpcRouter } from '../../router';

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
