/**
 * Workspace IPC event listeners → query invalidation
 *
 * Bridges Hub WebSocket events to React Query cache for workspaces.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useHubEvent } from '@renderer/shared/hooks';

import { workspaceKeys } from '../api/queryKeys';

/** Subscribe to hub workspace events and invalidate queries */
export function useWorkspaceEvents() {
  const queryClient = useQueryClient();

  useHubEvent('event:hub.workspaces.updated', () => {
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
  });
}
