/**
 * WorkflowStatusBar — Full workflow context indicator for the TopBar.
 *
 * Renders only when a ticket is active. Shows:
 *   ticket · run-slug · Phase · active-agent
 * Each segment is shown only when its value is present.
 */

import { Badge } from '@ui/badge';

import { useWorkflowStatus } from '../hooks/useWorkflowStatus';

const PHASE_LABELS: Record<string, string> = {
  research: 'Research',
  plan: 'Planning',
  'agent-team': 'Agent Team',
};

function Separator() {
  return (
    <span aria-hidden="true" className="mx-1 opacity-40">
      ·
    </span>
  );
}

export function WorkflowStatusBar() {
  const { ticket, phase, runSlug, activeAgent } = useWorkflowStatus();

  if (!ticket) {
    return null;
  }

  const phaseLabel = phase ? (PHASE_LABELS[phase] ?? phase) : null;
  // Humanise agent name: "schema-designer" → "schema-designer" (preserve as-is, agents name themselves)
  const agentLabel = activeAgent;

  const ariaLabel = [ticket, runSlug, phaseLabel, agentLabel].filter(Boolean).join(' · ');

  return (
    <Badge
      aria-label={`Active workflow: ${ariaLabel}`}
      className="shrink-0 max-w-xs truncate font-mono text-xs"
      size="sm"
      variant="secondary"
    >
      <span className="font-semibold">{ticket}</span>

      {runSlug ? (
        <>
          <Separator />
          <span>{runSlug}</span>
        </>
      ) : null}

      {phaseLabel ? (
        <>
          <Separator />
          <span>{phaseLabel}</span>
        </>
      ) : null}

      {agentLabel ? (
        <>
          <Separator />
          <span className="text-primary">{agentLabel}</span>
        </>
      ) : null}
    </Badge>
  );
}
