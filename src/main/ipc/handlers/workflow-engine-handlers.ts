/**
 * WorkflowEngine IPC Handlers
 *
 * Thin handlers — no business logic. All logic lives in WorkflowEngineService.
 */

import { WORKFLOW_ENGINE } from '@shared/ipc/workflow-engine/channels';

import type { WorkflowEngineService } from '../../services/workflow-engine';
import type { IpcRouter } from '../router';

export function registerWorkflowEngineHandlers(
  router: IpcRouter,
  workflowEngineService: WorkflowEngineService,
): void {
  router.handle(WORKFLOW_ENGINE.APPLY.TEMPLATE, ({ templateId, featureName, projectPath, overrides }) => {
    const runId = workflowEngineService.applyTemplate(templateId, featureName, projectPath, overrides);
    return Promise.resolve({ runId });
  });

  router.handle(WORKFLOW_ENGINE.START.RUN, (config) => {
    const runId = workflowEngineService.start(config);
    return Promise.resolve({ runId });
  });

  router.handle(WORKFLOW_ENGINE.STOP.RUN, ({ runId }) =>
    Promise.resolve(workflowEngineService.stop(runId)),
  );

  router.handle(WORKFLOW_ENGINE.GET.RUN, ({ runId }) =>
    Promise.resolve(workflowEngineService.get(runId) ?? null),
  );

  router.handle(WORKFLOW_ENGINE.LIST.RUNS, () =>
    Promise.resolve(workflowEngineService.list()),
  );

  router.handle(WORKFLOW_ENGINE.LIST.ARCHIVED, () =>
    Promise.resolve(workflowEngineService.listArchived()),
  );

  router.handle(WORKFLOW_ENGINE.LIST['AGENT-DEFS'], () =>
    workflowEngineService.listAgentDefinitions(),
  );
}
