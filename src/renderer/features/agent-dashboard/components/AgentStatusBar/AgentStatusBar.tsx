/**
 * AgentStatusBar — Displays agent name, model, status dot, and token usage
 *
 * Shared header component used across compact, expanded, and popup panel states.
 */

import type { AgentSession, AgentStatusUi } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { Badge, Text } from '@ui';

// ─── Props ─────────────────────────────────────────────────

interface AgentStatusBarProps {
  agent: AgentSession;
  className?: string;
}

// ─── Status Dot ────────────────────────────────────────────

const STATUS_STYLES: Record<AgentStatusUi, string> = {
  'running': 'bg-success',
  'idle': 'bg-info',
  'attention': 'bg-warning',
  'needs-attention': 'bg-warning',
  'failed': 'bg-destructive',
  'completed': 'bg-muted-foreground',
};

const STATUS_LABELS: Record<AgentStatusUi, string> = {
  'running': 'Running',
  'idle': 'Idle',
  'attention': 'Needs Attention',
  'needs-attention': 'Needs Attention',
  'failed': 'Failed',
  'completed': 'Completed',
};

function StatusDot({ status }: { status: AgentStatusUi }) {
  return (
    <span
      aria-label={STATUS_LABELS[status]}
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        STATUS_STYLES[status],
      )}
    />
  );
}

// ─── Token Helpers ─────────────────────────────────────────

const TASK_NUMBER_RE = /work\/[^/]+\/task-(\d+)/i;

function formatTokensCompact(count: number): string {
  if (count >= 1000) {
    return `${Math.round(count / 1000)}k`;
  }
  return String(count);
}

function deriveTaskNumber(branch: string | undefined): string | undefined {
  if (branch === undefined) return undefined;
  const match = TASK_NUMBER_RE.exec(branch);
  return match?.[1] ?? undefined;
}

// ─── Component ─────────────────────────────────────────────

export function AgentStatusBar({ agent, className }: AgentStatusBarProps) {
  const inputTokens = agent.tokenUsage.input;
  const outputTokens = agent.tokenUsage.output;
  const hasTokens = inputTokens > 0 || outputTokens > 0;
  const taskNumber = deriveTaskNumber(agent.branch);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <StatusDot status={agent.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {agent.name}
          </span>
          <Badge size="sm" variant="secondary">{agent.model}</Badge>
          {taskNumber === undefined ? null : (
            <Badge size="sm" variant="outline">Task #{taskNumber}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Text size="sm" variant="muted">{STATUS_LABELS[agent.status]}</Text>
          {hasTokens ? (
            <>
              <span aria-hidden="true" className="text-xs text-muted-foreground">|</span>
              <Text size="sm" variant="muted">
                {formatTokensCompact(inputTokens)}&#8593; {formatTokensCompact(outputTokens)}&#8595;
              </Text>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
