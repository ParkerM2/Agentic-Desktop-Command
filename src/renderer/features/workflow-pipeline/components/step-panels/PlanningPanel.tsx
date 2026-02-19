/**
 * PlanningPanel — Shows "planning in progress" indicator with execution logs.
 * Provides a kill button when an active session exists.
 */

import { Loader2, StopCircle } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useKillAgent } from '@features/tasks/api/useAgentMutations';
import { ExecutionLog } from '@features/tasks/components/detail/ExecutionLog';

interface PlanningPanelProps {
  task: Task;
}

export function PlanningPanel({ task }: PlanningPanelProps) {
  const killAgent = useKillAgent();

  const sessionId = task.metadata?.sessionId as string | undefined;

  function handleKill() {
    if (sessionId) {
      killAgent.mutate({ sessionId });
    }
  }

  return (
    <div className="space-y-4">
      {/* Planning indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
          <span className="text-foreground text-sm font-medium">Planning in progress...</span>
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

      {/* Pulsing progress bar */}
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
      </div>

      {/* Execution logs */}
      <ExecutionLog logs={task.logs ?? []} />
    </div>
  );
}
