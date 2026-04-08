/**
 * PlanningPanel — Shows "planning in progress" indicator with execution logs.
 * Provides a kill button when an active session exists.
 */

import { Loader2, StopCircle } from 'lucide-react';

import type { Task } from '@shared/types';

import { Button, Progress } from '@ui';

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
          <Button
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={killAgent.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleKill}
          >
            <StopCircle className="h-3.5 w-3.5" />
            {killAgent.isPending ? 'Stopping...' : 'Stop'}
          </Button>
        ) : null}
      </div>

      {/* Pulsing progress bar */}
      <Progress className="animate-pulse" size="sm" value={33} />

      {/* Execution logs */}
      <ExecutionLog logs={task.logs ?? []} />
    </div>
  );
}
