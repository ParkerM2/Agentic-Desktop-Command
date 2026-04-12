/**
 * Unified Workflow Service
 *
 * Composes the workflow engine module and workflow templates module
 * into a single unified service. This is the single registration point
 * in the service registry for all workflow functionality.
 */

import { createWorkflowEngineModule } from './engine';
import { createWorkflowTemplateService } from './templates';

import type { WorkflowEngineService, WorkflowEngineDeps } from './engine';
import type { WorkflowTemplateService } from './templates';

export interface WorkflowServiceDeps extends Omit<WorkflowEngineDeps, 'templateService'> {
  dataDir: string;
}

export interface WorkflowService {
  engine: WorkflowEngineService;
  templates: WorkflowTemplateService;
}

export function createWorkflowService(deps: WorkflowServiceDeps): WorkflowService {
  const templates = createWorkflowTemplateService({ dataDir: deps.dataDir });

  const engine = createWorkflowEngineModule({
    db: deps.db,
    busSessionManager: deps.busSessionManager,
    gitService: deps.gitService,
    templateService: templates,
    progressBaseDir: deps.progressBaseDir,
    onStateChanged: deps.onStateChanged,
    onCompleted: deps.onCompleted,
    onError: deps.onError,
  });

  return { engine, templates };
}
