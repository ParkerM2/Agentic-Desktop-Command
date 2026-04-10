/**
 * StatusFlow — Renders allowed status transitions as a horizontal badge flow with arrows.
 *
 * Highlights the current status with primary tone, grays out unreachable statuses,
 * and makes allowed transitions clickable to invoke onTransition.
 */

import { ChevronRight } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { StatusBadge } from '@ui';

// ─── Types ──────────────────────────────────────────────────

export interface StatusTransition {
  from: string;
  to: string;
}

export interface StatusFlowProps {
  currentStatus: string;
  statuses: string[];
  allowedTransitions: StatusTransition[];
  onTransition?: (toStatus: string) => void;
  statusLabels?: Record<string, string>;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

export function StatusFlow({
  currentStatus,
  statuses,
  allowedTransitions,
  onTransition,
  statusLabels,
  className,
}: StatusFlowProps) {
  // 1. Derived state
  const allowedTargets = new Set(
    allowedTransitions
      .filter((t) => t.from === currentStatus)
      .map((t) => t.to),
  );

  // 2. Handlers
  function handleTransitionClick(status: string) {
    if (allowedTargets.has(status) && onTransition) {
      onTransition(status);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent, status: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTransitionClick(status);
    }
  }

  // 3. Helpers
  function getLabel(status: string): string {
    return statusLabels?.[status] ?? status;
  }

  function renderStatus(status: string, index: number) {
    const isCurrent = status === currentStatus;
    const isAllowed = allowedTargets.has(status);
    const isInteractive = isAllowed && onTransition !== undefined;

    function getTone(): 'primary' | 'muted' {
      if (isCurrent) return 'primary';
      return 'muted';
    }

    return (
      <span
        key={status}
        className="flex items-center gap-1"
      >
        {index > 0 ? (
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              isAllowed ? 'text-muted-foreground' : 'text-muted-foreground/40',
            )}
          />
        ) : null}
        <StatusBadge
          aria-current={isCurrent ? 'step' : undefined}
          aria-disabled={!isInteractive || undefined}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          tone={getTone()}
          className={cn(
            isInteractive
              ? 'cursor-pointer hover:opacity-80 transition-opacity'
              : undefined,
            !isCurrent && !isAllowed ? 'opacity-40' : undefined,
          )}
          onClick={isInteractive ? () => { handleTransitionClick(status); } : undefined}
          onKeyDown={isInteractive ? (e) => { handleKeyDown(e, status); } : undefined}
        >
          {getLabel(status)}
        </StatusBadge>
      </span>
    );
  }

  // 4. Render
  return (
    <div
      aria-label="Status flow"
      className={cn('flex flex-wrap items-center gap-0.5', className)}
      data-testid="status-flow"
      role="group"
    >
      {statuses.map((status, index) => renderStatus(status, index))}
    </div>
  );
}
