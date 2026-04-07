/**
 * Workflow Template IPC Handlers
 *
 * Thin handlers — each one delegates directly to WorkflowTemplateService.
 * No business logic here.
 */

import type { WorkflowTemplateService } from '../../services/workflow-templates';
import type { IpcRouter } from '../router';

export function registerWorkflowTemplateHandlers(
  router: IpcRouter,
  workflowTemplateService: WorkflowTemplateService,
): void {
  router.handle('workflowTemplates.list', () =>
    Promise.resolve({ templates: workflowTemplateService.list() }),
  );

  router.handle('workflowTemplates.get', ({ id }) =>
    Promise.resolve({ template: workflowTemplateService.get(id) }),
  );

  router.handle('workflowTemplates.create', (data) =>
    Promise.resolve({ template: workflowTemplateService.create(data) }),
  );

  router.handle('workflowTemplates.update', ({ id, updates }) =>
    Promise.resolve({ template: workflowTemplateService.update(id, updates) }),
  );

  router.handle('workflowTemplates.delete', ({ id }) =>
    Promise.resolve(workflowTemplateService.delete(id)),
  );

  router.handle('workflowTemplates.duplicate', ({ id, name }) =>
    Promise.resolve({ template: workflowTemplateService.duplicate(id, name) }),
  );
}
