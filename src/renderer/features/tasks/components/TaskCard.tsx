/**
 * TaskCard — Compact card for task list
 */

import { Bot, Clock } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn, formatRelativeTime, truncate } from '@renderer/shared/lib/utils';

import { TaskStatusBadge } from './TaskStatusBadge';

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TaskCard({ task, isSelected, onClick, className }: TaskCardProps) {
  const progress = task.executionProgress;
  const isRunning = task.status === 'in_progress';

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'border-border bg-card cursor-pointer rounded-lg border p-3 transition-all',
        'hover:border-primary/30 hover:shadow-sm',
        isSelected && 'border-primary ring-primary/20 ring-1',
        className,
      )}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Title + Status */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm leading-tight font-medium">{truncate(task.title, 60)}</h3>
        <TaskStatusBadge status={task.status} />
      </div>

      {/* Description preview */}
      {task.description ? (
        <p className="text-muted-foreground mb-2 text-xs leading-relaxed">
          {truncate(task.description, 120)}
        </p>
      ) : null}

      {/* Progress bar (when running) */}
      {isRunning && progress ? (
        <div className="mb-2">
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {progress.phase}
            </span>
            <span>{Math.round(progress.overallProgress)}%</span>
          </div>
          <div className="bg-muted h-1.5 w-full rounded-full">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(task.updatedAt)}
        </span>
        {task.subtasks.length > 0 && (
          <span>
            {task.subtasks.filter((s) => s.status === 'completed').length}/{task.subtasks.length}{' '}
            subtasks
          </span>
        )}
      </div>
    </div>
  );
}
