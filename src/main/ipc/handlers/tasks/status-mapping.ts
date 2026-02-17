/**
 * Task status mapping between Hub API and local (legacy) status enums.
 *
 * Hub uses: backlog, planning, plan_ready, queued, running, paused, review, done, error
 * Local uses: backlog, queue, in_progress, ai_review, human_review, done, pr_created, error
 */

import type { TaskStatus as HubTaskStatus } from '@shared/types/hub-protocol';

/** Maps Hub task statuses to local (legacy) task statuses */
const HUB_TO_LOCAL_STATUS: Partial<Record<string, string>> = {
  backlog: 'backlog',
  planning: 'in_progress',
  plan_ready: 'ai_review',
  queued: 'queue',
  running: 'in_progress',
  paused: 'in_progress',
  review: 'ai_review',
  done: 'done',
  error: 'error',
};

/** Maps local task statuses to Hub task statuses */
const LOCAL_TO_HUB_STATUS: Partial<Record<string, HubTaskStatus>> = {
  backlog: 'backlog',
  queue: 'queued',
  in_progress: 'running',
  ai_review: 'review',
  human_review: 'review',
  done: 'done',
  pr_created: 'done',
  error: 'error',
};

export function mapHubStatusToLocal(hubStatus: string): string {
  return HUB_TO_LOCAL_STATUS[hubStatus] ?? hubStatus;
}

export function mapLocalStatusToHub(localStatus: string): HubTaskStatus {
  return LOCAL_TO_HUB_STATUS[localStatus] ?? (localStatus as HubTaskStatus);
}
