/**
 * Progress IPC Handlers
 *
 * Thin wrappers that delegate to ProgressService for all progress-domain
 * invoke channels, and forward service events to the renderer.
 * No business logic here.
 */

import { PROGRESS, PROGRESS_EVENTS } from '@shared/ipc/progress/channels';

import type { ProgressService } from "./progress-service";
import type { IpcRouter } from '../../ipc/router';

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

  router.handle(PROGRESS.LIST.TASKS, () => progressService.listTasks());

  router.handle(PROGRESS.GET.TASK, ({ slug }) => progressService.getTask(slug));

  router.handle(PROGRESS.CREATE.TASK, ({ slug, title, description, priority }) =>
    progressService.createTask(slug, title, description, priority),
  );

  router.handle(PROGRESS.UPDATE.TASK, ({ slug, updates }) =>
    progressService.updateTask(slug, updates),
  );

  router.handle(PROGRESS.ARCHIVE.TASK, async ({ slug }) => {
    await progressService.archiveTask(slug);
    return { success: true };
  });

  router.handle(PROGRESS.DELETE.TASK, async ({ slug }) => {
    await progressService.deleteTask(slug);
    return { success: true };
  });

  router.handle(PROGRESS.LIST.ARCHIVED, () => progressService.listArchived());

  router.handle(PROGRESS.START.RESEARCH, ({ slug, prompt }) =>
    progressService.startResearch(slug, prompt),
  );

  router.handle(PROGRESS.CREATE.PLAN, ({ slug, prompt }) =>
    progressService.createPlan(slug, prompt),
  );

  router.handle(PROGRESS.START.TEAM, async ({ slug, prompt }) => {
    const result = await progressService.spinUpTeam(slug, prompt);
    return { sessionId: result.sessionId, teamLeadIndex: 0, action: result.action };
  });

  router.handle(PROGRESS.START.WORKFLOW, ({ slug, templateId }) =>
    progressService.runWorkflow(slug, templateId),
  );

  router.handle(PROGRESS.CANCEL.ACTION, ({ slug }) => progressService.cancelAction(slug));

  router.handle(PROGRESS.RUN['LOG-CLEANUP'], () => progressService.runLogCleanup());

  // ── Event Forwarding ─────────────────────────────────────────
  // Subscribe to service events and forward them to the renderer via router.emit().

  progressService.onTaskUpdated((slug, task) => {
    router.emit(PROGRESS_EVENTS.TASK.UPDATED, { slug, task });
  });

  progressService.onTaskCreated((slug, task) => {
    router.emit(PROGRESS_EVENTS.TASK.CREATED, { slug, task });
  });

  progressService.onTaskArchived((slug) => {
    router.emit(PROGRESS_EVENTS.TASK.ARCHIVED, { slug });
  });

  progressService.onActionStarted((slug, action, sessionId) => {
    router.emit(PROGRESS_EVENTS.ACTION.STARTED, {
      slug,
      action: toProgressAction(action),
      sessionId,
    });
  });

  progressService.onActionCompleted((slug, action) => {
    router.emit(PROGRESS_EVENTS.ACTION.COMPLETED, { slug, action: toProgressAction(action) });
  });

  progressService.onActionFailed((slug, action, error) => {
    router.emit(PROGRESS_EVENTS.ACTION.FAILED, { slug, action: toProgressAction(action), error });
  });

  progressService.onWorkflowStep((slug, step, status) => {
    router.emit(PROGRESS_EVENTS.WORKFLOW.STEP, {
      slug,
      step: toProgressAction(step),
      status: toWorkflowStepStatus(status),
    });
  });
}
