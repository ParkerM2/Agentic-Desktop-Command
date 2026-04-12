/**
 * RunningPanel — Shows execution progress with progress bar, phase badge,
 * and a kill button.
 */

import { Loader2, StopCircle } from 'lucide-react';

import type { ProgressTask } from '@shared/types/progress';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Progress } from '@ui';

import { useKillAgent } from '@features/tasks/api/useAgentMutations';

interface RunningPanelProps {
  task: ProgressTask;
}

export function RunningPanel({ task }: RunningPanelProps) {
  const killAgent = useKillAgent();

  const sessionId = task.lastSessionId ?? undefined;
  const phase = task.workflowPhase ?? 'executing';

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

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Overall progress</span>
        </div>
        <Progress className="animate-pulse" size="sm" value={50} />
      </div>
    </div>
  );
}
