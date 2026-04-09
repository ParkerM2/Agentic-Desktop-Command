import { domain, events } from '../channel-builder';

export const WORKFLOW_ENGINE = domain('workflow-engine', {
  APPLY: ['template'],
  START: ['run'],
  STOP: ['run'],
  GET: ['run'],
  LIST: ['runs', 'archived', 'agent-defs'],
});

export const WORKFLOW_ENGINE_EVENTS = events('workflow-engine', {
  STATE: ['changed'],
  RUN: ['completed', 'error'],
});
