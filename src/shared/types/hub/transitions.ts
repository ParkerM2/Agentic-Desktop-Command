/**
 * Hub Protocol — Task Status Transition Validation
 */

import type { TaskStatus } from './enums';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['planning', 'queued', 'running'],
  planning: ['plan_ready', 'error', 'backlog'],
  plan_ready: ['queued', 'running', 'backlog'],
  queued: ['backlog', 'running'],
  running: ['paused', 'done', 'error', 'review'],
  paused: ['running', 'queued'],
  review: ['done', 'error', 'running'],
  done: [], // Terminal state
  error: ['queued', 'backlog', 'planning'],
};

export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true; // No-op is always valid
  return VALID_TRANSITIONS[from].includes(to);
}

export function getValidNextStatuses(current: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[current];
}
