/**
 * Task IPC handlers
 */

import type { AgentService } from '../../services/agent/agent-service';
import type { ProjectService } from '../../services/project/project-service';
import type { TaskService } from '../../services/project/task-service';
import type { GithubTaskImporter } from '../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../services/tasks/task-decomposer';
import type { IpcRouter } from '../router';

export interface TaskHandlerDeps {
  taskService: TaskService;
  agentService: AgentService;
  projectService: ProjectService;
  taskDecomposer: TaskDecomposer;
  githubImporter: GithubTaskImporter;
}

export function registerTaskHandlers(
  router: IpcRouter,
  service: TaskService,
  agentService: AgentService,
  projectService: ProjectService,
  taskDecomposer?: TaskDecomposer,
  githubImporter?: GithubTaskImporter,
): void {
  router.handle('tasks.list', ({ projectId }) => Promise.resolve(service.listTasks(projectId)));

  router.handle('tasks.get', ({ projectId, taskId }) =>
    Promise.resolve(service.getTask(projectId, taskId)),
  );

  router.handle('tasks.create', (draft) => Promise.resolve(service.createTask(draft)));

  router.handle('tasks.update', ({ taskId, updates }) =>
    Promise.resolve(service.updateTask(taskId, updates)),
  );

  router.handle('tasks.updateStatus', ({ taskId, status }) =>
    Promise.resolve(service.updateTaskStatus(taskId, status)),
  );

  router.handle('tasks.delete', ({ taskId, projectId }) => {
    service.deleteTask(projectId, taskId);
    return Promise.resolve({ success: true });
  });

  router.handle('tasks.listAll', () => Promise.resolve(service.listAllTasks()));

  router.handle('tasks.execute', ({ taskId, projectId }) => {
    // Get project path for the agent working directory
    const projectPath = projectService.getProjectPath(projectId);

    // Start or queue the agent
    const result = agentService.startAgent(taskId, projectId, projectPath ?? '');

    if (result.session) {
      // Agent started immediately
      service.updateTaskStatus(taskId, 'in_progress');
      return Promise.resolve({ agentId: result.session.id });
    }

    // Agent was queued — task stays in queue status
    service.updateTaskStatus(taskId, 'queue');
    return Promise.resolve({ agentId: result.queued?.id ?? '' });
  });

  // ── Smart Task Creation Handlers ────────────────────────────

  router.handle('tasks.decompose', async ({ description }) => {
    if (!taskDecomposer) {
      throw new Error('Task decomposer is not available');
    }
    return await taskDecomposer.decompose(description);
  });

  router.handle('tasks.importFromGithub', async ({ url, projectId }) => {
    if (!githubImporter) {
      throw new Error('GitHub importer is not available');
    }
    return await githubImporter.importFromUrl(url, projectId);
  });

  router.handle('tasks.listGithubIssues', async ({ owner, repo }) => {
    if (!githubImporter) {
      throw new Error('GitHub importer is not available');
    }
    return await githubImporter.listImportableIssues(owner, repo);
  });
}
