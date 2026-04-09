/**
 * TaskStatusBadge — Color-coded status indicator for hub TaskStatus values.
 *
 * Uses the shared StatusBadge glass-pill component for consistent styling
 * across the app (matches HealthIndicator and ProgressTaskGrid badges).
 */

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { StatusBadge } from '@ui';

import type { StatusBadgeProps } from '@ui';

const ACTIVE_STATUSES = new Set<TaskStatus>(['planning', 'running']);

const statusConfig: Record<
  TaskStatus,
  { label: string; tone: StatusBadgeProps['tone'] }
> = {
  backlog: { label: 'Backlog', tone: 'muted' },
  planning: { label: 'Planning', tone: 'info' },
  plan_ready: { label: 'Plan Ready', tone: 'purple' },
  queued: { label: 'Queued', tone: 'info' },
  running: { label: 'Running', tone: 'primary' },
  paused: { label: 'Paused', tone: 'amber' },
  review: { label: 'Review', tone: 'amber' },
  done: { label: 'Done', tone: 'success' },
  error: { label: 'Error', tone: 'destructive' },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <StatusBadge
      className={cn(className)}
      pulsing={ACTIVE_STATUSES.has(status)}
      tone={config.tone}
    >
      {config.label}
    </StatusBadge>
  );
}
