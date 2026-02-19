/**
 * Task status mapping — unified on Hub enum values.
 *
 * Hub and local now share the same enum:
 *   backlog, planning, plan_ready, queued, running, paused, review, done, error
 *
 * mapHubStatusToLocal is now identity (Hub = local).
 * mapLocalStatusToHub maps any remaining legacy values via LEGACY_STATUS_MAP.
 */

import type { TaskStatus } from '@shared/types';
import { LEGACY_STATUS_MAP } from '@shared/types';

/** Identity — Hub and local statuses are now unified. */
export function mapHubStatusToLocal(hubStatus: string): string {
  return hubStatus;
}

/** Maps legacy status values to Hub enum; passes through unified values as-is. */
export function mapLocalStatusToHub(localStatus: string): TaskStatus {
  return LEGACY_STATUS_MAP[localStatus] ?? (localStatus as TaskStatus);
}
