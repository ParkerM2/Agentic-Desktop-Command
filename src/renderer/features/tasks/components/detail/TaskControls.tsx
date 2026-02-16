/**
 * TaskControls -- Action buttons for task detail: Run, Stop, Retry, Delete
 *
 * Run/Stop/Retry delegate to orchestrator callbacks from the parent.
 * Delete is handled directly via useDeleteTask.
 */

import { useState } from 'react';

import { Play, RefreshCw, Square, Trash2 } from 'lucide-react';

import type { Task } from '@shared/types';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';
import { cn } from '@renderer/shared/lib/utils';

import { useDeleteTask } from '../../api/useTaskMutations';

interface TaskControlsProps {
  task: Task;
  onRun?: (taskId: string) => void;
  onStop?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
}

const CONTROL_BUTTON_BASE =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors';

export function TaskControls({ task, onRun, onStop, onRetry }: TaskControlsProps) {
  const deleteTask = useDeleteTask();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const status = task.status as string;
  const isRunning = status === 'in_progress' || status === 'running' || status === 'planning';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <button
          aria-label="Stop task"
          className={cn('bg-warning/10 text-warning hover:bg-warning/20', CONTROL_BUTTON_BASE)}
          onClick={() => {
            onStop?.(task.id);
          }}
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
          onClick={() => {
            onRun?.(task.id);
          }}
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      )}

      {isError ? (
        <button
          aria-label="Retry task"
          className={cn('bg-info/10 text-info hover:bg-info/20', CONTROL_BUTTON_BASE)}
          onClick={() => {
            onRetry?.(task.id);
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      ) : null}

      <button
        aria-label="Delete task"
        className={cn('bg-destructive/10 text-destructive hover:bg-destructive/20', CONTROL_BUTTON_BASE)}
        onClick={() => {
          setDeleteConfirmOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      <ConfirmDialog
        confirmLabel="Delete"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        loading={deleteTask.isPending}
        open={deleteConfirmOpen}
        title="Delete Task"
        variant="destructive"
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          deleteTask.mutate(
            { taskId: task.id },
            {
              onSuccess: () => {
                setDeleteConfirmOpen(false);
              },
            },
          );
        }}
      />
    </div>
  );
}
