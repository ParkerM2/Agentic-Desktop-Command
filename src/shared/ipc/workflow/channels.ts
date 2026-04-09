import { domain, events } from '../channel-builder';

export const WORKFLOW = domain('workflow', {
  WATCH: ['progress'],
  STOP: ['watching', 'running'],
  LAUNCH: ['workflow'],
  CHECK: ['running'],
});

export const WORKFLOW_EVENTS = events('workflow', {
  WORKFLOW: ['milestone', 'context', 'permission'],
});
