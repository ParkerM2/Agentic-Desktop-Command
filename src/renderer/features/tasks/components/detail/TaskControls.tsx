/**
 * TaskControls -- Action buttons for task detail: Run, Stop, Retry, Delete
 */

import { Play, RefreshCw, Square, Trash2 } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useCancelTask, useDeleteTask, useExecuteTask } from '../../api/useTaskMutations';

interface TaskControlsProps {
  task: Task;
}

const CONTROL_BUTTON_BASE =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors';

export function TaskControls({ task }: TaskControlsProps) {
  const executeTask = useExecuteTask();
  const cancelTask = useCancelTask();
  const deleteTask = useDeleteTask();

  const isRunning = task.status === 'in_progress';
  const isDone = task.status === 'done';
  const isError = task.status === 'error';

  function handleRun() {
    executeTask.mutate({ taskId: task.id });
  }

  function handleStop() {
    cancelTask.mutate({ taskId: task.id });
  }

  function handleRetry() {
    executeTask.mutate({ taskId: task.id });
  }

  function handleDelete() {
    deleteTask.mutate({ taskId: task.id });
  }

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <button
          aria-label="Stop task"
          className={cn('bg-warning/10 text-warning hover:bg-warning/20', CONTROL_BUTTON_BASE)}
          onClick={handleStop}
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      ) : (
        <button
          aria-label="Run task"
          disabled={isDone}
          className={cn(
            'bg-primary/10 text-primary hover:bg-primary/20',
            CONTROL_BUTTON_BASE,
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onClick={handleRun}
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      )}

      {isError ? (
        <button
          aria-label="Retry task"
          className={cn('bg-info/10 text-info hover:bg-info/20', CONTROL_BUTTON_BASE)}
          onClick={handleRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      ) : null}

      <button
        aria-label="Delete task"
        className={cn('bg-destructive/10 text-destructive hover:bg-destructive/20', CONTROL_BUTTON_BASE)}
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
}
