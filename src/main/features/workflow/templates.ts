/**
 * Workflow Templates Sub-Module
 *
 * Re-exports the template service from the workflow-templates feature.
 * Templates are a dependency of the engine module.
 */

export { createWorkflowTemplateService } from '../workflow-templates/workflow-template-service';
export type { WorkflowTemplateService } from '../workflow-templates/workflow-template-service';
