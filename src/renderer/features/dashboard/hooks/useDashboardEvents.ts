/**
 * Dashboard IPC event listeners -> query invalidation
 *
 * Listens for project, agent, and capture events to keep dashboard data fresh.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';

import { useAgentEvents } from '@features/agents';
import { useProjectEvents } from '@features/projects';

import { dashboardKeys } from '../api/queryKeys';

export function useDashboardEvents() {
  const queryClient = useQueryClient();

  useProjectEvents();
  useAgentEvents();

  useIpcEvent('event:dashboard.captureChanged', () => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.captures() });
  });
}
