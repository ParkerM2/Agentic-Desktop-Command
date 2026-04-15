/**
 * Workspace IPC event listeners → query invalidation
 *
 * Bridges Hub WebSocket events to React Query cache for workspaces.
 */

import { useQueryClient } from '@tanstack/react-query';

import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { useHubEvent } from '@renderer/shared/hooks';

import { workspaceKeys } from '../api/workspacesQueryKeys';

/** Subscribe to hub workspace events and invalidate queries */
export function useWorkspaceEvents() {
  const queryClient = useQueryClient();

  useHubEvent(HUB_EVENTS.WORKSPACE.UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
  });
}
