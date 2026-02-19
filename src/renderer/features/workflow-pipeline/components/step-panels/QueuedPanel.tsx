/**
 * QueuedPanel — Shows waiting state for tasks queued for execution.
 * Displays brief plan summary if plan content is available.
 */

import { Clock } from 'lucide-react';

import type { Task } from '@shared/types';

import { truncate } from '@renderer/shared/lib/utils';

interface QueuedPanelProps {
  task: Task;
}

export function QueuedPanel({ task }: QueuedPanelProps) {
  const planContent = task.metadata?.planContent as string | undefined;

  return (
    <div className="space-y-4">
      {/* Waiting state */}
      <div className="flex items-center gap-2">
        <Clock className="text-muted-foreground h-4 w-4 shrink-0 animate-pulse" />
        <span className="text-foreground text-sm font-medium">Task is queued for execution</span>
      </div>

      <p className="text-muted-foreground text-xs">
        This task is waiting for an available agent to begin execution.
      </p>

      {/* Plan summary */}
      {planContent ? (
        <div className="border-border rounded-md border p-3">
          <div className="text-muted-foreground mb-1.5 text-xs font-medium">Plan Summary</div>
          <p className="text-foreground text-xs leading-relaxed">
            {truncate(planContent, 200)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
