/**
 * RunningWorkflowsPanel — Shows active workflow engine runs with state badges and kill button
 */

import { Square } from 'lucide-react';

import type { WorkflowEngineRecordSchema, WorkflowStateSchema } from '@shared/ipc/workflow-engine/schemas';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Spinner,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui';

import { useStopWorkflow, useWorkflowRuns } from '../api/useWorkflowEngine';

import type { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────

type WorkflowRun = z.infer<typeof WorkflowEngineRecordSchema>;
type WorkflowState = z.infer<typeof WorkflowStateSchema>;

// ─── State badge map ─────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATE_VARIANT: Record<WorkflowState, BadgeVariant> = {
  IDLE: 'outline',
  PREFLIGHT: 'secondary',
  PLAN: 'secondary',
  SETUP: 'secondary',
  SPAWNING: 'default',
  QA_GATE: 'default',
  GUARDIAN: 'default',
  FINALIZING: 'default',
  DONE: 'outline',
  ERROR: 'destructive',
};

const TERMINAL_STATES: ReadonlySet<WorkflowState> = new Set(['DONE', 'ERROR']);

// ─── Component ───────────────────────────────────────────────

export function RunningWorkflowsPanel() {
  const { data: runs, isLoading, isError } = useWorkflowRuns();
  const stopWorkflow = useStopWorkflow();

  function handleStop(runId: string) {
    stopWorkflow.mutate(runId);
  }

  function renderBody() {
    if (isLoading) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="sm" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Text size="sm" variant="muted">
            Failed to load workflow runs
          </Text>
        </div>
      );
    }

    const list = runs ?? [];
    const isEmpty = list.length === 0;

    if (isEmpty) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Text size="sm" variant="muted">
            No active workflows
          </Text>
        </div>
      );
    }

    return (
      <ul className="space-y-2 p-1">
        {list.map((run) => {
          const stoppingThisRun =
            stopWorkflow.isPending && stopWorkflow.variables === run.runId;
          return (
            <li key={run.runId}>
              <WorkflowRunRow
                isStopping={stoppingThisRun}
                run={run}
                onStop={handleStop}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <TooltipProvider>
      <Card className="flex h-full flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle>Running Workflows</CardTitle>
          <CardDescription>Active workflow engine runs</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-full">{renderBody()}</ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ─── WorkflowRunRow ──────────────────────────────────────────

interface WorkflowRunRowProps {
  run: WorkflowRun;
  isStopping: boolean;
  onStop: (runId: string) => void;
}

function WorkflowRunRow({ run, isStopping, onStop }: WorkflowRunRowProps) {
  const isTerminal = TERMINAL_STATES.has(run.state);
  const startedAt = new Date(run.startedAt).toLocaleTimeString();
  const hasError = run.errorMessage !== null;
  const hasQaRounds = run.qaRound > 0;

  return (
    <div className="flex items-start gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/30">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {run.featureName}
          </span>
          <Badge className="shrink-0 text-xs" variant={STATE_VARIANT[run.state]}>
            {run.state}
          </Badge>
          {hasQaRounds ? (
            <Text size="sm" variant="muted">
              QA round {run.qaRound}
            </Text>
          ) : null}
        </div>

        <div className="mt-0.5 flex items-center gap-3">
          <Text size="sm" variant="muted">
            Started {startedAt}
          </Text>
          {hasError ? (
            <Text className="line-clamp-1 text-destructive" size="sm">
              {run.errorMessage}
            </Text>
          ) : null}
        </div>
      </div>

      {isTerminal ? null : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`Stop ${run.featureName}`}
              className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
              disabled={isStopping}
              size="icon"
              variant="ghost"
              onClick={() => onStop(run.runId)}
            >
              {isStopping ? <Spinner className="h-3.5 w-3.5" size="sm" /> : <Square className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop workflow</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
