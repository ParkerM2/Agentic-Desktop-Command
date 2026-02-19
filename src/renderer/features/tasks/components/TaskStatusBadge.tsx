/**
 * TaskStatusBadge — Color-coded status indicator
 */

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  backlog: { label: 'Backlog', className: 'bg-zinc-500/15 text-zinc-400' },
  planning: { label: 'Planning', className: 'bg-blue-500/15 text-blue-400' },
  plan_ready: { label: 'Plan Ready', className: 'bg-purple-500/15 text-purple-400' },
  queued: { label: 'Queued', className: 'bg-blue-500/15 text-blue-400' },
  running: { label: 'Running', className: 'bg-amber-500/15 text-amber-400' },
  paused: { label: 'Paused', className: 'bg-orange-500/15 text-orange-400' },
  review: { label: 'Review', className: 'bg-purple-500/15 text-purple-400' },
  done: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-400' },
  error: { label: 'Error', className: 'bg-red-500/15 text-red-400' },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
