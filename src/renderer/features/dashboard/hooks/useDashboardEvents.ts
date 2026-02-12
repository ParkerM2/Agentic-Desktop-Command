/**
 * Dashboard IPC event listeners -> query invalidation
 *
 * Listens for project and agent events to keep dashboard data fresh.
 */

import { useAgentEvents } from '@features/agents';
import { useProjectEvents } from '@features/projects';

export function useDashboardEvents() {
  useProjectEvents();
  useAgentEvents();
}
