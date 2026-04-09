import { domain, events } from '../channel-builder';

export const PROGRESS = domain('progress', {
  LIST: ['tasks', 'archived'],
  GET: ['task'],
  CREATE: ['task', 'plan'],
  UPDATE: ['task'],
  DELETE: ['task'],
  ARCHIVE: ['task'],
  START: ['research', 'team', 'workflow'],
  CANCEL: ['action'],
  RUN: ['log-cleanup'],
});

export const PROGRESS_EVENTS = events('progress', {
  TASK: ['updated', 'created', 'archived'],
  ACTION: ['started', 'completed', 'failed'],
  WORKFLOW: ['step'],
});
