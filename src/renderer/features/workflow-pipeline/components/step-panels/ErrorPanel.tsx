/**
 * ErrorPanel — Displays error details with recovery actions.
 * Provides retry-from-checkpoint and requeue buttons.
 */

import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useRestartFromCheckpoint } from '@features/tasks/api/useAgentMutations';
import { useUpdateTaskStatus } from '@features/tasks/api/useTaskMutations';

interface ErrorPanelProps {
  task: Task;
}

function getErrorMessage(task: Task): string {
  const metadataError = task.metadata?.error;
  if (typeof metadataError === 'string' && metadataError.length > 0) {
    return metadataError;
  }
  const logs = task.logs ?? [];
  if (logs.length > 0) {
    return logs.at(-1) ?? 'Unknown error occurred';
  }
  return 'An unknown error occurred during task execution.';
}

export function ErrorPanel({ task }: ErrorPanelProps) {
  const restartFromCheckpoint = useRestartFromCheckpoint();
  const updateStatus = useUpdateTaskStatus();

  const errorMessage = getErrorMessage(task);

  function handleRetry() {
    restartFromCheckpoint.mutate({
      taskId: task.id,
      projectPath: (task.metadata?.worktreePath) ?? '',
    });
  }

  function handleRequeue() {
    updateStatus.mutate({ taskId: task.id, status: 'queued' });
  }

  return (
    <div className="space-y-4">
      {/* Error header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-destructive h-4 w-4 shrink-0" />
        <span className="text-destructive text-sm font-medium">Task Failed</span>
      </div>

      {/* Error message box */}
      <div className="bg-destructive/5 border-destructive/20 rounded-md border p-4">
        <pre className="text-destructive whitespace-pre-wrap font-mono text-xs leading-relaxed">
          {errorMessage}
        </pre>
      </div>

      {/* Recovery actions */}
      <div className="flex items-center gap-2">
        <button
          disabled={restartFromCheckpoint.isPending}
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-primary/10 text-primary hover:bg-primary/20',
          )}
          onClick={handleRetry}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {restartFromCheckpoint.isPending ? 'Retrying...' : 'Retry from Checkpoint'}
        </button>
        <button
          disabled={updateStatus.isPending}
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          onClick={handleRequeue}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {updateStatus.isPending ? 'Requeueing...' : 'Requeue'}
        </button>
      </div>
    </div>
  );
}
