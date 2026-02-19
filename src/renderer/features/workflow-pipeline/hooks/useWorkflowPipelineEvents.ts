/**
 * Workflow Pipeline event hook
 *
 * Delegates to the existing agent event infrastructure
 * for real-time cache updates on agent progress, heartbeat, and status changes.
 */

import { useAgentEvents } from '@features/tasks/hooks/useAgentEvents';

export function useWorkflowPipelineEvents() {
  useAgentEvents();
}
