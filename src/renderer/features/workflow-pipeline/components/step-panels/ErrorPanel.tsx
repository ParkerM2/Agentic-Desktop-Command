/**
 * ErrorPanel — Displays error details with recovery actions.
 * Provides retry-from-checkpoint and requeue buttons.
 */

import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

import type { Task } from '@shared/types';

import { Button, Code } from '@ui';

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
        <Code className="text-destructive whitespace-pre-wrap text-xs leading-relaxed">
          {errorMessage}
        </Code>
      </div>

      {/* Recovery actions */}
      <div className="flex items-center gap-2">
        <Button
          disabled={restartFromCheckpoint.isPending}
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10 hover:text-primary"
          onClick={handleRetry}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {restartFromCheckpoint.isPending ? 'Retrying...' : 'Retry from Checkpoint'}
        </Button>
        <Button
          disabled={updateStatus.isPending}
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRequeue}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {updateStatus.isPending ? 'Requeueing...' : 'Requeue'}
        </Button>
      </div>
    </div>
  );
}
