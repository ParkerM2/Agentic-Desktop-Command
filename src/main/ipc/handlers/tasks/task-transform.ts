/**
 * Hub → Local task type transformation.
 *
 * Converts Hub API task responses into the local (legacy) Task shape
 * expected by the renderer's `tasks.*` channels.
 */

import type { InvokeOutput } from '@shared/ipc-contract';
import type { Task as HubTask } from '@shared/types/hub-protocol';

import { mapHubStatusToLocal } from './status-mapping';

// Hub API Task shape differs from the legacy local TaskSchema.
// Legacy channels cast Hub responses through unknown at this boundary.
type LegacyTask = InvokeOutput<'tasks.get'>;
type LegacyTaskList = InvokeOutput<'tasks.list'>;

/**
 * Transforms a Hub API task response into the local (legacy) Task shape.
 * Hub returns flat fields; local expects nested structures.
 */
export function transformHubTask(hubTask: HubTask): LegacyTask {
  const metadata: Record<string, unknown> = {
    ...(hubTask.metadata ?? {}),
  };

  // Map Hub flat cost fields into metadata
  const hubRaw = hubTask as unknown as Record<string, unknown>;
  if (hubRaw.costUsd !== undefined) {
    metadata.costUsd = hubRaw.costUsd;
  }
  if (hubRaw.costTokens !== undefined) {
    metadata.costTokens = hubRaw.costTokens;
  }
  if (hubRaw.agentName !== undefined) {
    metadata.agentName = hubRaw.agentName;
  }

  // Map Hub flat PR fields into prStatus-like metadata
  if (hubRaw.prNumber !== undefined || hubRaw.prUrl !== undefined) {
    metadata.prUrl = hubRaw.prUrl;
    metadata.prNumber = hubRaw.prNumber;
    metadata.prState = hubRaw.prState;
    metadata.prCiStatus = hubRaw.prCiStatus;
  }

  return {
    id: hubTask.id,
    title: hubTask.title,
    description: hubTask.description,
    status: mapHubStatusToLocal(hubTask.status) as LegacyTask['status'],
    subtasks: [],
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    createdAt: hubTask.createdAt,
    updatedAt: hubTask.updatedAt,
  };
}

export function transformHubTaskList(hubTasks: HubTask[]): LegacyTaskList {
  return hubTasks.map(transformHubTask);
}
