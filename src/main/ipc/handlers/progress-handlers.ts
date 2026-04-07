/**
 * Progress IPC Handlers
 *
 * Thin wrappers that delegate to ProgressService for all progress-domain
 * invoke channels, and forward service events to the renderer.
 * No business logic here.
 */

import type { ProgressService } from '../../services/progress/progress-service';
import type { IpcRouter } from '../router';

type ProgressAction = 'research' | 'plan' | 'team';
type WorkflowStepStatus = 'started' | 'completed' | 'failed';

function toProgressAction(action: string): ProgressAction {
  if (action === 'research' || action === 'plan' || action === 'team') return action;
  return 'research';
}

function toWorkflowStepStatus(status: string): WorkflowStepStatus {
  if (status === 'started' || status === 'completed' || status === 'failed') return status;
  return 'failed';
}

export function registerProgressHandlers(
  router: IpcRouter,
  progressService: ProgressService,
): void {
  // ── Invoke Handlers ──────────────────────────────────────────

  router.handle('progress.listTasks', () => progressService.listTasks());

  router.handle('progress.getTask', ({ slug }) => progressService.getTask(slug));

  router.handle('progress.createTask', ({ slug, title, description, priority }) =>
    progressService.createTask(slug, title, description, priority),
  );

  router.handle('progress.updateTask', ({ slug, updates }) =>
    progressService.updateTask(slug, updates),
  );

  router.handle('progress.archiveTask', async ({ slug }) => {
    await progressService.archiveTask(slug);
    return { success: true };
  });

  router.handle('progress.deleteTask', async ({ slug }) => {
    await progressService.deleteTask(slug);
    return { success: true };
  });

  router.handle('progress.listArchived', () => progressService.listArchived());

  router.handle('progress.startResearch', ({ slug, prompt }) =>
    progressService.startResearch(slug, prompt),
  );

  router.handle('progress.createPlan', ({ slug, prompt }) =>
    progressService.createPlan(slug, prompt),
  );

  router.handle('progress.spinUpTeam', async ({ slug, prompt }) => {
    const result = await progressService.spinUpTeam(slug, prompt);
    return { sessionId: result.sessionId, teamLeadIndex: 0, action: result.action };
  });

  router.handle('progress.runWorkflow', ({ slug }) => progressService.runWorkflow(slug));

  router.handle('progress.cancelAction', ({ slug }) => progressService.cancelAction(slug));

  router.handle('progress.runLogCleanup', () => progressService.runLogCleanup());

  // ── Event Forwarding ─────────────────────────────────────────
  // Subscribe to service events and forward them to the renderer via router.emit().

  progressService.onTaskUpdated((slug, task) => {
    router.emit('event:progress.taskUpdated', { slug, task });
  });

  progressService.onTaskCreated((slug, task) => {
    router.emit('event:progress.taskCreated', { slug, task });
  });

  progressService.onTaskArchived((slug) => {
    router.emit('event:progress.taskArchived', { slug });
  });

  progressService.onActionStarted((slug, action, sessionId) => {
    router.emit('event:progress.actionStarted', {
      slug,
      action: toProgressAction(action),
      sessionId,
    });
  });

  progressService.onActionCompleted((slug, action) => {
    router.emit('event:progress.actionCompleted', { slug, action: toProgressAction(action) });
  });

  progressService.onActionFailed((slug, action, error) => {
    router.emit('event:progress.actionFailed', { slug, action: toProgressAction(action), error });
  });

  progressService.onWorkflowStep((slug, step, status) => {
    router.emit('event:progress.workflowStep', {
      slug,
      step: toProgressAction(step),
      status: toWorkflowStepStatus(status),
    });
  });
}
