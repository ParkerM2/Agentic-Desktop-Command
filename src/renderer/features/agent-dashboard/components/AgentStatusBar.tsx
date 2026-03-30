/**
 * AgentStatusBar — Displays agent name, model, status dot, and token usage
 *
 * Shared header component used across compact, expanded, and popup panel states.
 */

import type { AgentSession, AgentStatus } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { Badge } from '@ui';

// ─── Props ─────────────────────────────────────────────────

interface AgentStatusBarProps {
  agent: AgentSession;
  className?: string;
}

// ─── Status Dot ────────────────────────────────────────────

const STATUS_STYLES: Record<AgentStatus, string> = {
  running: 'bg-success',
  idle: 'bg-info',
  attention: 'bg-warning',
  failed: 'bg-destructive',
  completed: 'bg-muted-foreground',
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  running: 'Running',
  idle: 'Idle',
  attention: 'Needs Attention',
  failed: 'Failed',
  completed: 'Completed',
};

function StatusDot({ status }: { status: AgentStatus }) {
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

// ─── Token Display ─────────────────────────────────────────

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

// ─── Component ─────────────────────────────────────────────

export function AgentStatusBar({ agent, className }: AgentStatusBarProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <StatusDot status={agent.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {agent.name}
          </span>
          <Badge size="sm" variant="secondary">{agent.model}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{STATUS_LABELS[agent.status]}</span>
          <span aria-hidden="true">|</span>
          <span>{formatTokens(agent.tokens.inputTokens)} in / {formatTokens(agent.tokens.outputTokens)} out</span>
        </div>
      </div>
    </div>
  );
}
