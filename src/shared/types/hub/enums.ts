/**
 * Hub Protocol — Enums & Literal Types
 */

export type TaskStatus =
  | 'backlog'
  | 'planning'
  | 'plan_ready'
  | 'queued'
  | 'running'
  | 'paused'
  | 'review'
  | 'done'
  | 'error';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DeviceType = 'desktop' | 'mobile' | 'web';

export type RepoStructure = 'single' | 'monorepo' | 'multi-repo';
