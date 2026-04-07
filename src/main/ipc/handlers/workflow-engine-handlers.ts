/**
 * WorkflowEngine IPC Handlers
 *
 * Thin handlers — no business logic. All logic lives in WorkflowEngineService.
 */

import type { WorkflowEngineService } from '../../services/workflow-engine';
import type { IpcRouter } from '../router';

export function registerWorkflowEngineHandlers(
  router: IpcRouter,
  workflowEngineService: WorkflowEngineService,
): void {
  router.handle('workflow-engine.start', (config) => {
    const runId = workflowEngineService.start(config);
    return Promise.resolve({ runId });
  });

  router.handle('workflow-engine.stop', ({ runId }) =>
    Promise.resolve(workflowEngineService.stop(runId)),
  );

  router.handle('workflow-engine.get', ({ runId }) =>
    Promise.resolve(workflowEngineService.get(runId) ?? null),
  );

  router.handle('workflow-engine.list', () =>
    Promise.resolve(workflowEngineService.list()),
  );
}
