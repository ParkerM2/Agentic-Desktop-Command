/**
 * useWorkflowStatus — Combined workflow state for the status bar.
 *
 * Merges context (ticket, phase, runSlug) with the currently active agent
 * derived from milestone events. The active agent is set on `agent.spawned`
 * and cleared on `run.complete` or `run.failed`.
 */

import { useCallback, useState } from 'react';

import { useWorkflowContext } from './useWorkflowContext';
import { useWorkflowMilestones } from './useWorkflowMilestones';

import type { MilestoneEvent } from './useWorkflowMilestones';

const AGENT_CLEAR_EVENTS = new Set(['run.complete', 'run.failed', 'wave.complete']);

export interface WorkflowStatus {
  ticket: string | null;
  phase: 'research' | 'plan' | 'agent-team' | null;
  runSlug: string | null;
  activeAgent: string | null;
}

export function useWorkflowStatus(): WorkflowStatus {
  const { ticket, phase, runSlug } = useWorkflowContext();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const handleMilestone = useCallback((event: MilestoneEvent) => {
    if (event.event === 'agent.spawned' && event.agent) {
      setActiveAgent(event.agent);
    } else if (AGENT_CLEAR_EVENTS.has(event.event)) {
      setActiveAgent(null);
    }
  }, []);

  useWorkflowMilestones(handleMilestone);

  return { ticket, phase, runSlug, activeAgent };
}
