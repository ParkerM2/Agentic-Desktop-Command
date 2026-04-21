/**
 * Workspace IPC event listeners → query invalidation
 *
 * Bridges Hub WebSocket events to React Query cache for workspaces.
 */

import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { rule, useQueryInvalidator } from '@renderer/features/agent-dashboard/hooks/useQueryInvalidator';

import { workspaceKeys } from '../api/workspacesQueryKeys';

const INVALIDATION_RULES = [
  rule({
    channel: HUB_EVENTS.WORKSPACE.UPDATED,
    queryKeys: () => [workspaceKeys.list()],
  }),
];

/** Subscribe to hub workspace events and invalidate queries */
export function useWorkspaceEvents() {
  useQueryInvalidator(INVALIDATION_RULES);
}
