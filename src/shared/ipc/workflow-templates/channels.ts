import { domain, events } from '../channel-builder';

export const WORKFLOW_TEMPLATES = domain('workflow-templates', {
  LIST: ['all'],
  GET: ['template'],
  CREATE: ['template'],
  UPDATE: ['template'],
  DELETE: ['template'],
  DUPLICATE: ['template'],
  SCAN: ['artifacts'],
  WRITE: ['artifact'],
});

export const WORKFLOW_TEMPLATES_EVENTS = events('workflow-templates', {
  TEMPLATE: ['created', 'updated', 'deleted'],
});
