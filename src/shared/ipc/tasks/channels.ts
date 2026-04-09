import { domain, events } from '../channel-builder';

export const TASKS = domain('tasks', {
  LIST: ['all', 'every'],
  GET: ['task'],
  CREATE: ['task'],
  UPDATE: ['task', 'status'],
  DELETE: ['task'],
  EXECUTE: ['task'],
  DECOMPOSE: ['task'],
  IMPORT: ['github-issues'],
  LIST_GITHUB: ['issues'],
});

export const HUB_TASKS = domain('hub-tasks', {
  LIST: ['all'],
  GET: ['task'],
  CREATE: ['task'],
  UPDATE: ['task', 'status'],
  DELETE: ['task'],
  EXECUTE: ['task'],
  CANCEL: ['task'],
});

export const TASKS_EVENTS = events('tasks', {
  STATUS: ['changed'],
  PROGRESS: ['updated'],
  LOG: ['appended'],
  PLAN: ['updated'],
});

export const HUB_TASKS_EVENTS = events('hub-tasks', {
  TASK: ['created', 'updated', 'deleted'],
  PROGRESS: ['updated'],
  TASK_RUN: ['completed'],
});
