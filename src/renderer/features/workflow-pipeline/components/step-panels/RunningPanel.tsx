/**
 * RunningPanel — Shows execution progress with progress bar, phase badge,
 * subtask list, execution logs, and a kill button.
 */

import { Loader2, StopCircle } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useKillAgent } from '@features/tasks/api/useAgentMutations';
import { ExecutionLog } from '@features/tasks/components/detail/ExecutionLog';
import { SubtaskList } from '@features/tasks/components/detail/SubtaskList';

interface RunningPanelProps {
  task: Task;
}

export function RunningPanel({ task }: RunningPanelProps) {
  const killAgent = useKillAgent();

  const sessionId = task.metadata?.sessionId as string | undefined;
  const progress = task.executionProgress;
  const overallPercent = progress?.overallProgress ?? 0;
  const phase = progress?.phase ?? 'idle';

  function handleKill() {
    if (sessionId) {
      killAgent.mutate({ sessionId });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with phase and kill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
          <span className="text-foreground text-sm font-medium">Executing...</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
              'bg-primary/10 text-primary',
            )}
          >
            {phase}
          </span>
        </div>
        {sessionId ? (
          <button
            disabled={killAgent.isPending}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              'bg-destructive/10 text-destructive hover:bg-destructive/20',
            )}
            onClick={handleKill}
          >
            <StopCircle className="h-3.5 w-3.5" />
            {killAgent.isPending ? 'Stopping...' : 'Stop'}
          </button>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Overall progress</span>
          <span className="text-foreground text-xs font-medium">{overallPercent}%</span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${String(overallPercent)}%` }}
          />
        </div>
        {progress?.message ? (
          <p className="text-muted-foreground text-xs">{progress.message}</p>
        ) : null}
      </div>

      {/* Subtask list */}
      <SubtaskList subtasks={task.subtasks} />

      {/* Execution logs */}
      <ExecutionLog logs={task.logs ?? []} />
    </div>
  );
}
