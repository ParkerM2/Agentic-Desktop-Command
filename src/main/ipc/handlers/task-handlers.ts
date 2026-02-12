/**
 * Task IPC handlers
 */

import type { AgentService } from '../../services/agent/agent-service';
import type { ProjectService } from '../../services/project/project-service';
import type { TaskService } from '../../services/project/task-service';
import type { IpcRouter } from '../router';

export function registerTaskHandlers(
  router: IpcRouter,
  service: TaskService,
  agentService: AgentService,
  projectService: ProjectService,
): void {
  router.handle('tasks.list', ({ projectId }) =>
    Promise.resolve(service.listTasks(projectId)),
  );

  router.handle('tasks.get', ({ projectId, taskId }) =>
    Promise.resolve(service.getTask(projectId, taskId)),
  );

  router.handle('tasks.create', (draft) =>
    Promise.resolve(service.createTask(draft)),
  );

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

  router.handle('tasks.execute', ({ taskId, projectId }) => {
    // Update task status to in_progress
    service.updateTaskStatus(taskId, 'in_progress');

    // Get project path for the agent working directory
    const projectPath = projectService.getProjectPath(projectId);

    // Start the agent
    const session = agentService.startAgent(taskId, projectId, projectPath ?? '');

    return Promise.resolve({ agentId: session.id });
  });
}
