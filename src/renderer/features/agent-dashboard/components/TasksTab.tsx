/**
 * TasksTab — Workflow task progress display
 *
 * Shows task name, phase progress bar, phases checklist,
 * and acceptance criteria within the agent panel tabs.
 */

import { CheckCircle2, CheckSquare, Circle, Clock, ListChecks, Square } from 'lucide-react';

import type { PhaseStatus, TaskCriterion, TaskPhase } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { Progress, ScrollArea } from '@ui';

import { useTasksForFeature } from '../api/useTaskProgress';
import { useProgressEvents } from '../hooks/useProgressEvents';

// ─── Props ─────────────────────────────────────────────────

interface TasksTabProps {
  taskId?: string;
  featureSlug?: string;
  className?: string;
}

// ─── Helpers ───────────────────────────────────────────────

function deriveFeatureSlug(branch?: string): string {
  if (branch === undefined) return 'agent-dashboard-view';
  // work/<slug>/<task>
  const workMatch = /^work\/([^/]+)\//.exec(branch);
  if (workMatch?.[1] !== undefined) return workMatch[1];
  // feature/<slug>
  const featureMatch = /^feature\/([^/]+)/.exec(branch);
  if (featureMatch?.[1] !== undefined) return featureMatch[1];
  return 'agent-dashboard-view';
}

function getPhaseIcon(status: PhaseStatus) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
  }
  if (status === 'in-progress') {
    return <Clock className="h-4 w-4 shrink-0 animate-pulse text-warning" />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function getCriterionIcon(met: boolean) {
  return met
    ? <CheckSquare className="h-4 w-4 shrink-0 text-success" />
    : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

// ─── Sub-Components ────────────────────────────────────────

function PhasesChecklist({ phases }: { phases: TaskPhase[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Phases</p>
      {phases.map((phase) => (
        <div key={phase.name} className="flex items-center gap-2 text-sm">
          {getPhaseIcon(phase.status)}
          <span className={cn(
            phase.status === 'pending' ? 'text-muted-foreground' : 'text-foreground',
          )}>
            {phase.name}
          </span>
          {phase.duration === undefined ? null : (
            <span className="ml-auto text-xs text-muted-foreground">
              {String(Math.round(phase.duration / 1000))}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AcceptanceCriteria({ criteria }: { criteria: TaskCriterion[] }) {
  if (criteria.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Acceptance Criteria</p>
      {criteria.map((criterion) => (
        <div key={criterion.text} className="flex items-start gap-2 text-sm">
          {getCriterionIcon(criterion.met)}
          <span className={cn(
            criterion.met ? 'text-foreground' : 'text-muted-foreground',
          )}>
            {criterion.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────

export function TasksTab({ taskId, featureSlug, className }: TasksTabProps) {
  const slug = featureSlug ?? deriveFeatureSlug();
  const { data: tasks, isLoading } = useTasksForFeature(slug);

  useProgressEvents();

  if (taskId === undefined) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', className)}>
        <ListChecks className="mb-2 h-8 w-8" />
        <p className="text-sm">No task assigned</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const taskList = tasks ?? [];
  const task = taskList.find((t) => String(t.taskNumber) === taskId);

  if (task === undefined) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', className)}>
        <ListChecks className="mb-2 h-8 w-8" />
        <p className="text-sm">Task not found</p>
      </div>
    );
  }

  const completedPhases = task.phases.filter((p) => p.status === 'completed').length;
  const totalPhases = task.phases.length;
  const progressPercent = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 p-4">
        {/* Task header + progress */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{task.taskName}</h3>
          <div className="flex items-center gap-2">
            <Progress className="flex-1" size="sm" value={progressPercent} />
            <span className="shrink-0 text-xs text-muted-foreground">
              {String(completedPhases)}/{String(totalPhases)}
            </span>
          </div>
        </div>

        {/* Phases checklist */}
        {task.phases.length > 0 ? (
          <PhasesChecklist phases={task.phases} />
        ) : null}

        {/* Acceptance criteria */}
        <AcceptanceCriteria criteria={task.acceptanceCriteria} />
      </div>
    </ScrollArea>
  );
}
