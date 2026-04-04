/**
 * useWorkflowContext — Subscribe to event:workflow.context push events.
 *
 * Returns the current active workflow context (ticket, phase, runSlug).
 * Initializes from null state and updates on every push from main.
 */

import { useState } from 'react';

import { useIpcEvent } from '@renderer/shared/hooks';

interface WorkflowContext {
  ticket: string | null;
  phase: 'research' | 'plan' | 'agent-team' | null;
  runSlug: string | null;
}

const INITIAL_CONTEXT: WorkflowContext = {
  ticket: null,
  phase: null,
  runSlug: null,
};

export function useWorkflowContext(): WorkflowContext {
  const [context, setContext] = useState<WorkflowContext>(INITIAL_CONTEXT);

  useIpcEvent('event:workflow.context', (payload) => {
    setContext({
      ticket: payload.ticket,
      phase: payload.phase,
      runSlug: payload.runSlug,
    });
  });

  return context;
}
