/**
 * Workflow Template IPC Handlers
 *
 * Thin handlers — each one delegates directly to WorkflowTemplateService.
 * No business logic here.
 */

import { WORKFLOW_TEMPLATES, WORKFLOW_TEMPLATES_EVENTS } from '@shared/ipc/workflow-templates/channels';

import type { WorkflowTemplateService } from ".";
import type { IpcRouter } from '../../../ipc/router';

export function registerWorkflowTemplateHandlers(
  router: IpcRouter,
  workflowTemplateService: WorkflowTemplateService,
): void {
  router.handle(WORKFLOW_TEMPLATES.LIST.ALL, () =>
    Promise.resolve({ templates: workflowTemplateService.list() }),
  );

  router.handle(WORKFLOW_TEMPLATES.GET.TEMPLATE, ({ id }) =>
    Promise.resolve({ template: workflowTemplateService.get(id) }),
  );

  router.handle(WORKFLOW_TEMPLATES.CREATE.TEMPLATE, (data) => {
    const template = workflowTemplateService.create(data);
    router.emit(WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.CREATED, { id: template.id, name: template.name });
    return Promise.resolve({ template });
  });

  router.handle(WORKFLOW_TEMPLATES.UPDATE.TEMPLATE, ({ id, updates }) => {
    const template = workflowTemplateService.update(id, updates);
    router.emit(WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.UPDATED, { id: template.id, name: template.name });
    return Promise.resolve({ template });
  });

  router.handle(WORKFLOW_TEMPLATES.DELETE.TEMPLATE, ({ id }) => {
    const result = workflowTemplateService.delete(id);
    router.emit(WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.DELETED, { id });
    return Promise.resolve(result);
  });

  router.handle(WORKFLOW_TEMPLATES.DUPLICATE.TEMPLATE, ({ id, name }) =>
    Promise.resolve({ template: workflowTemplateService.duplicate(id, name) }),
  );

  router.handle(WORKFLOW_TEMPLATES.SCAN.ARTIFACTS, ({ projectPath }) =>
    Promise.resolve({ artifacts: workflowTemplateService.scanArtifacts(projectPath) }),
  );

  router.handle(WORKFLOW_TEMPLATES.WRITE.ARTIFACT, ({ projectPath, type, name, content }) =>
    Promise.resolve(workflowTemplateService.writeArtifact(projectPath, type, name, content)),
  );
}
