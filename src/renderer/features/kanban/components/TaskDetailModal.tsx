/**
 * TaskDetailModal — Full task details with logs, subtasks, and actions
 */

import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Play,
  Trash2,
  Clock,
  Bot,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import type { Task } from '@shared/types';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import {
  useDeleteTask,
  useExecuteTask,
  TaskStatusBadge,
} from '@features/tasks';

interface TaskDetailModalProps {
  task: Task;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const subtaskIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

export function TaskDetailModal({ task, projectId, open, onClose }: TaskDetailModalProps) {
  const deleteTask = useDeleteTask();
  const executeTask = useExecuteTask();

  const progress = task.executionProgress;
  const canExecute = ['backlog', 'queue', 'error'].includes(task.status);

  function handleExecute() {
    executeTask.mutate({ taskId: task.id, projectId });
  }

  function handleDelete() {
    deleteTask.mutate({ taskId: task.id, projectId });
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed top-0 right-0 z-50 h-full w-full max-w-2xl',
            'bg-background border-border border-l shadow-2xl',
            'overflow-y-auto',
            'animate-in slide-in-from-right duration-200',
          )}
        >
          {/* Header */}
          <div className="border-border bg-background sticky top-0 z-10 flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-3">
              <TaskStatusBadge status={task.status} />
              <span className="text-muted-foreground text-xs">{task.id.slice(0, 8)}</span>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-6">
            {/* Title + Description */}
            <div>
              <h2 className="mb-2 text-xl font-bold">{task.title}</h2>
              {task.description ? (
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {canExecute ? (
                <button
                  disabled={executeTask.isPending}
                  className={cn(
                    'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                    'hover:bg-primary/90 disabled:opacity-50',
                  )}
                  onClick={handleExecute}
                >
                  <Play className="h-4 w-4" />
                  Execute Task
                </button>
              ) : null}
              <button
                className="border-border text-destructive hover:bg-destructive/10 flex items-center gap-2 rounded-md border px-4 py-2 text-sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>

            {/* Execution Progress */}
            {progress ? (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4" />
                  Execution Progress
                </h3>
                <div className="border-border space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{progress.phase}</span>
                    <span className="text-muted-foreground">
                      {Math.round(progress.overallProgress)}%
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.overallProgress}%` }}
                    />
                  </div>
                  {progress.message ? (
                    <p className="text-muted-foreground text-xs">{progress.message}</p>
                  ) : null}
                  {(progress.completedPhases?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {progress.completedPhases?.map((phase) => (
                        <span
                          key={phase}
                          className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400"
                        >
                          ✓ {phase}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Subtasks */}
            {task.subtasks.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Subtasks ({task.subtasks.filter((s) => s.status === 'completed').length}/
                  {task.subtasks.length})
                </h3>
                <div className="space-y-1.5">
                  {task.subtasks.map((subtask) => {
                    const Icon = subtaskIcons[subtask.status] ?? Circle;
                    return (
                      <div
                        key={subtask.id}
                        className="border-border flex items-start gap-2.5 rounded-md border p-3"
                      >
                        <Icon
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            subtask.status === 'completed' && 'text-emerald-400',
                            subtask.status === 'failed' && 'text-red-400',
                            subtask.status === 'in_progress' && 'animate-spin text-amber-400',
                            subtask.status === 'pending' && 'text-muted-foreground',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{subtask.title}</p>
                          {subtask.description ? (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {subtask.description}
                            </p>
                          ) : null}
                          {subtask.files.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {subtask.files.map((file) => (
                                <span
                                  key={file}
                                  className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs"
                                >
                                  {file}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Logs */}
            {task.logs && task.logs.length > 0 ? (
              <section>
                <h3 className="mb-3 text-sm font-medium">Logs</h3>
                <div className="border-border max-h-64 overflow-y-auto rounded-lg border bg-black/50 p-3">
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-300">
                    {task.logs.join('\n')}
                  </pre>
                </div>
              </section>
            ) : null}

            {/* Metadata */}
            <section className="text-muted-foreground border-border space-y-1 border-t pt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Created {formatRelativeTime(task.createdAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Updated {formatRelativeTime(task.updatedAt)}
              </div>
              {task.reviewReason ? <div>Review reason: {task.reviewReason}</div> : null}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
