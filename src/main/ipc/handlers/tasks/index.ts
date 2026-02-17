/**
 * Task handlers barrel — re-exports the combined registerTaskHandlers().
 */

import { registerHubTaskHandlers } from './hub-task-handlers';
import { registerLegacyTaskHandlers } from './legacy-task-handlers';

import type { HubApiClient } from '../../../services/hub/hub-api-client';
import type { GithubTaskImporter } from '../../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../../services/tasks/task-decomposer';
import type { IpcRouter } from '../../router';

export { mapHubStatusToLocal, mapLocalStatusToHub } from './status-mapping';
export { transformHubTask, transformHubTaskList } from './task-transform';

export interface TaskHandlerDeps {
  hubApiClient: HubApiClient;
  taskDecomposer?: TaskDecomposer;
  githubImporter?: GithubTaskImporter;
}

export function registerTaskHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  taskDecomposer?: TaskDecomposer,
  githubImporter?: GithubTaskImporter,
): void {
  registerHubTaskHandlers(router, hubApiClient);
  registerLegacyTaskHandlers(router, hubApiClient, taskDecomposer, githubImporter);
}
