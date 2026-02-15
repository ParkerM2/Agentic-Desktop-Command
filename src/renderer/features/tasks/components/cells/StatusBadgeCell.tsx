/**
 * StatusBadgeCell — AG-Grid cell renderer for task status with colored badge.
 * Shows a pulsing dot for "in_progress" status.
 */

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  backlog: {
    label: 'Backlog',
    className: 'bg-muted text-muted-foreground border-border',
  },
  queue: {
    label: 'Queue',
    className: 'bg-info/15 text-info border-info/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  ai_review: {
    label: 'AI Review',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  human_review: {
    label: 'Review',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  done: {
    label: 'Done',
    className: 'bg-success/15 text-success border-success/30',
  },
  pr_created: {
    label: 'PR Created',
    className: 'bg-info/15 text-info border-info/30',
  },
  error: {
    label: 'Error',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export function StatusBadgeCell(props: CustomCellRendererProps) {
  const status = (props.value as TaskStatus | undefined) ?? 'backlog';
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center py-1">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
          config.className,
        )}
      >
        {status === 'in_progress' ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        ) : null}
        {config.label}
      </span>
    </div>
  );
}
