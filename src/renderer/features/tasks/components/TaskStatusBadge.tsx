/**
 * TaskStatusBadge — Color-coded status indicator
 */

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Badge } from '@ui';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  backlog: { label: 'Backlog', className: 'bg-zinc-500/15 text-zinc-400 border-transparent' },
  planning: { label: 'Planning', className: 'bg-blue-500/15 text-blue-400 border-transparent' },
  plan_ready: { label: 'Plan Ready', className: 'bg-purple-500/15 text-purple-400 border-transparent' },
  queued: { label: 'Queued', className: 'bg-blue-500/15 text-blue-400 border-transparent' },
  running: { label: 'Running', className: 'bg-amber-500/15 text-amber-400 border-transparent' },
  paused: { label: 'Paused', className: 'bg-orange-500/15 text-orange-400 border-transparent' },
  review: { label: 'Review', className: 'bg-purple-500/15 text-purple-400 border-transparent' },
  done: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-400 border-transparent' },
  error: { label: 'Error', className: 'bg-red-500/15 text-red-400 border-transparent' },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge className={cn(config.className, className)} size="sm" variant="outline">
      {config.label}
    </Badge>
  );
}
