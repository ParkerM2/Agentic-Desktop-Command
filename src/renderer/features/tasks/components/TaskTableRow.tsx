/**
 * TaskTableRow — Individual row in the task table
 */

import { Play, Trash2 } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn, formatRelativeTime, truncate } from '@renderer/shared/lib/utils';

import { TaskStatusBadge } from './TaskStatusBadge';

interface TaskTableRowProps {
  isSelected: boolean;
  task: Task;
  onClick: () => void;
  onDelete: () => void;
  onExecute: () => void;
  onSelect: () => void;
}

export function TaskTableRow({
  isSelected,
  task,
  onClick,
  onDelete,
  onExecute,
  onSelect,
}: TaskTableRowProps) {
  const progress = task.executionProgress;
  const isRunning = task.status === 'in_progress';
  const projectName = (task.metadata?.projectId as string | undefined) ?? '';

  return (
    <div
      role="row"
      className={cn(
        'border-border flex items-center gap-3 border-b px-4 py-2.5 transition-colors',
        'hover:bg-muted/20',
        isSelected && 'bg-primary/5',
      )}
    >
      {/* Checkbox */}
      <div className="w-8 shrink-0">
        <input
          aria-label={`Select task: ${task.title}`}
          checked={isSelected}
          className="accent-primary h-4 w-4 rounded"
          type="checkbox"
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        />
      </div>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className={cn(
            'text-foreground w-full text-left text-sm font-medium',
            'hover:text-primary truncate transition-colors',
          )}
          onClick={onClick}
        >
          {truncate(task.title, 80)}
        </button>
        {/* Progress bar when running */}
        {isRunning && progress ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="bg-muted h-1.5 flex-1 rounded-full">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${String(progress.overallProgress)}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs">
              {Math.round(progress.overallProgress)}%
            </span>
          </div>
        ) : null}
      </div>

      {/* Status */}
      <div className="w-28">
        <TaskStatusBadge status={task.status} />
      </div>

      {/* Project */}
      <div className="w-36 truncate text-sm text-muted-foreground">
        {projectName ? truncate(projectName, 20) : '--'}
      </div>

      {/* Updated */}
      <div className="w-24 text-xs text-muted-foreground">
        {formatRelativeTime(task.updatedAt)}
      </div>

      {/* Actions */}
      <div className="flex w-20 shrink-0 items-center justify-end gap-1">
        <button
          aria-label={`Execute task: ${task.title}`}
          type="button"
          className={cn(
            'text-muted-foreground hover:text-primary rounded p-1.5 transition-colors',
            'hover:bg-muted/50',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onExecute();
          }}
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          aria-label={`Delete task: ${task.title}`}
          type="button"
          className={cn(
            'text-muted-foreground hover:text-destructive rounded p-1.5 transition-colors',
            'hover:bg-destructive/10',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
