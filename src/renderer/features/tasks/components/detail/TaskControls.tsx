/**
 * TaskControls -- Action buttons for task detail: Run, Stop, Retry, Launch, Delete
 *
 * Run/Stop/Retry delegate to orchestrator callbacks from the parent.
 * Launch delegates to the workflow feature's useLaunchTask.
 * Delete is handled directly via useDeleteTask.
 */

import { useState } from 'react';

import { Play, RefreshCw, Rocket, Square, Trash2 } from 'lucide-react';

import type { Task } from '@shared/types';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';

import { Button } from '@ui';

import { useDeleteTask } from '../../api/useTaskMutations';

interface TaskControlsProps {
  task: Task;
  onRun?: (taskId: string) => void;
  onStop?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onLaunch?: (taskId: string) => void;
}

export function TaskControls({ task, onRun, onStop, onRetry, onLaunch }: TaskControlsProps) {
  const deleteTask = useDeleteTask();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const status = task.status as string;
  const isRunning = status === 'running' || status === 'planning';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <Button
          aria-label="Stop task"
          className="bg-warning/10 text-warning hover:bg-warning/20"
          size="sm"
          variant="ghost"
          onClick={() => {
            onStop?.(task.id);
          }}
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </Button>
      ) : (
        <Button
          aria-label="Run task"
          className="bg-primary/10 text-primary hover:bg-primary/20"
          disabled={isDone}
          size="sm"
          variant="ghost"
          onClick={() => {
            onRun?.(task.id);
          }}
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </Button>
      )}

      {!isRunning && !isDone ? (
        <Button
          aria-label="Launch via workflow"
          className="bg-accent/10 text-accent-foreground hover:bg-accent/20"
          size="sm"
          variant="ghost"
          onClick={() => {
            onLaunch?.(task.id);
          }}
        >
          <Rocket className="h-3.5 w-3.5" />
          Launch
        </Button>
      ) : null}

      {isError ? (
        <Button
          aria-label="Retry task"
          className="bg-info/10 text-info hover:bg-info/20"
          size="sm"
          variant="ghost"
          onClick={() => {
            onRetry?.(task.id);
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}

      <Button
        aria-label="Delete task"
        className="bg-destructive/10 text-destructive hover:bg-destructive/20"
        size="sm"
        variant="ghost"
        onClick={() => {
          setDeleteConfirmOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

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
