/**
 * ErrorPanel — Displays error details with recovery actions.
 * Provides requeue button to move the task back to backlog.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';

import type { ProgressTask } from '@shared/types/progress';

import { Button, Code } from '@ui';

import { useUpdateProgressTask } from '@features/tasks/api/useProgressMutations';

interface ErrorPanelProps {
  task: ProgressTask;
}

function getErrorMessage(task: ProgressTask): string {
  // ProgressTask doesn't carry metadata.error or logs; show description as fallback
  if (task.description.length > 0) {
    return task.description;
  }
  return 'An unknown error occurred during task execution.';
}

export function ErrorPanel({ task }: ErrorPanelProps) {
  const updateTask = useUpdateProgressTask();

  const errorMessage = getErrorMessage(task);

  function handleRequeue() {
    updateTask.mutate({ slug: task.slug, updates: { status: 'backlog' } });
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
          disabled={updateTask.isPending}
          size="sm"
          type="button"
          variant="secondary"
          onClick={handleRequeue}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {updateTask.isPending ? 'Requeueing...' : 'Requeue'}
        </Button>
      </div>
    </div>
  );
}
