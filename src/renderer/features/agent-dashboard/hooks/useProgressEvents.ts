/**
 * Task progress event subscription -> query invalidation
 *
 * Subscribes to task update events from the main process and
 * invalidates the relevant task queries in React Query cache.
 */

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { agentDashboardKeys } from '../api/queryKeys';

import { rule, useQueryInvalidator } from './useQueryInvalidator';

const INVALIDATION_RULES = [
  rule({
    channel: AGENT_DASHBOARD_EVENTS.TASK.UPDATED,
    queryKeys: (event) => [
      agentDashboardKeys.tasks(event.featureSlug),
      agentDashboardKeys.task(event.featureSlug, event.task.taskNumber),
    ],
  }),
];

/** Subscribe to task update events and invalidate task queries */
export function useProgressEvents() {
  useQueryInvalidator(INVALIDATION_RULES);
}
