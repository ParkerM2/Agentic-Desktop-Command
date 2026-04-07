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

  router.handle('workflowTemplates.create', (data) => {
    const template = workflowTemplateService.create(data);
    router.emit('event:workflowTemplates.created', { id: template.id, name: template.name });
    return Promise.resolve({ template });
  });

  router.handle('workflowTemplates.update', ({ id, updates }) => {
    const template = workflowTemplateService.update(id, updates);
    router.emit('event:workflowTemplates.updated', { id: template.id, name: template.name });
    return Promise.resolve({ template });
  });

  router.handle('workflowTemplates.delete', ({ id }) => {
    const result = workflowTemplateService.delete(id);
    router.emit('event:workflowTemplates.deleted', { id });
    return Promise.resolve(result);
  });

  router.handle('workflowTemplates.duplicate', ({ id, name }) =>
    Promise.resolve({ template: workflowTemplateService.duplicate(id, name) }),
  );

  router.handle('workflowTemplates.scanArtifacts', ({ projectPath }) =>
    Promise.resolve({ artifacts: workflowTemplateService.scanArtifacts(projectPath) }),
  );

  router.handle('workflowTemplates.writeArtifact', ({ projectPath, type, name, content }) =>
    Promise.resolve(workflowTemplateService.writeArtifact(projectPath, type, name, content)),
  );
}
