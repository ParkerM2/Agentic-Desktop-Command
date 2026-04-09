/**
 * useWorkflowMilestones — Subscribe to event:workflow.milestone push events.
 *
 * Accepts a callback that fires on every milestone event.
 * For future use by panels that need to react to workflow progress.
 */

import { WORKFLOW_EVENTS } from '@shared/ipc/workflow/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface MilestoneEvent {
  ticket: string;
  run: string | null;
  event: string;
  agent: string | null;
  ts: string;
  data: Record<string, unknown>;
}

export function useWorkflowMilestones(onMilestone: (event: MilestoneEvent) => void): void {
  useIpcEvent(WORKFLOW_EVENTS.WORKFLOW.MILESTONE, (payload) => {
    onMilestone({
      ticket: payload.ticket,
      run: payload.run,
      event: payload.event,
      agent: payload.agent,
      ts: payload.ts,
      data: payload.data,
    });
  });
}
