/**
 * QA session event subscription -> query invalidation
 *
 * Subscribes to QA session update events from the main process and
 * invalidates the relevant QA queries in React Query cache.
 */

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { agentDashboardKeys } from '../api/queryKeys';

import { rule, useQueryInvalidator } from './useQueryInvalidator';

const INVALIDATION_RULES = [
  rule({
    channel: AGENT_DASHBOARD_EVENTS.QA['SESSION-UPDATED'],
    queryKeys: (session) => [
      agentDashboardKeys.qaSession(session.taskId),
      agentDashboardKeys.qaSessions(),
    ],
  }),
];

/** Subscribe to QA session update events and invalidate QA queries */
export function useQaEvents() {
  useQueryInvalidator(INVALIDATION_RULES);
}
