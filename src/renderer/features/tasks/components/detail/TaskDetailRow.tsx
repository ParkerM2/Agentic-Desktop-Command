/**
 * TaskDetailRow -- Full-width expanded view with subtasks, logs, PR info, plan, and controls.
 * Rendered as a full-width row below the parent task row in the grid.
 */

import type { Task } from '@shared/types';

import { ExecutionLog } from './ExecutionLog';
import { PlanViewer } from './PlanViewer';
import { PRStatusPanel } from './PrStatusPanel';
import { QaReportViewer } from './QaReportViewer';
import { SubtaskList } from './SubtaskList';
import { TaskControls } from './TaskControls';

interface TaskDetailRowProps {
  task: Task;
  onApproveAndExecute?: (taskId: string) => void;
  onRejectPlan?: (taskId: string) => void;
  onRequestChanges?: (taskId: string, feedback: string) => void;
  onKillAgent?: (taskId: string) => void;
  onRestartCheckpoint?: (taskId: string) => void;
  onLaunchWorkflow?: (taskId: string) => void;
}

/** Check if a task has a plan based on status or metadata */
function hasPlan(task: Task): boolean {
  const hubStatus = task.status as string;
  const planStatuses = new Set(['plan_ready', 'queued', 'running', 'paused', 'review', 'done']);
  return planStatuses.has(hubStatus) || typeof task.metadata?.planContent === 'string';
}

export function TaskDetailRow({ task, onApproveAndExecute, onRejectPlan, onRequestChanges, onKillAgent, onRestartCheckpoint, onLaunchWorkflow }: TaskDetailRowProps) {
  const showPlan = hasPlan(task);
  const planContent = (task.metadata?.planContent as string | undefined) ?? null;

  // Show QA report tab for review/done statuses or if metadata indicates QA ran
  const qaRelevantStatuses = new Set(['review', 'done']);
  const showQa = qaRelevantStatuses.has(task.status as string);

  return (
    <div className="bg-card/50 border-border border-b px-6 py-4">
      {/* Plan section — shown when plan exists */}
      {showPlan ? (
        <div className="border-border mb-4 border-b pb-4">
          <PlanViewer
            planContent={planContent}
            status={task.status as string}
            taskId={task.id}
            onApproveAndExecute={onApproveAndExecute}
            onReject={onRejectPlan}
            onRequestChanges={onRequestChanges}
          />
        </div>
      ) : null}

      {/* QA Report section — shown for review/done statuses */}
      {showQa ? (
        <div className="border-border mb-4 border-b pb-4">
          <div className="text-muted-foreground mb-2 text-xs font-medium">QA Report</div>
          <QaReportViewer taskId={task.id} />
        </div>
      ) : null}

      {/* Three-column layout: Subtasks | Logs | PR Status */}
      <div className="mb-4 grid grid-cols-3 gap-6">
        {/* Left: Subtasks */}
        <div className="min-w-0">
          <SubtaskList subtasks={task.subtasks} />
        </div>

        {/* Center: Execution Log */}
        <div className="min-w-0">
          <ExecutionLog logs={task.logs ?? []} />
        </div>

        {/* Right: PR Status */}
        <div className="min-w-0">
          <PRStatusPanel
            prStatus={task.prStatus}
            prUrl={task.metadata?.prUrl}
          />
        </div>
      </div>

      {/* Bottom: Controls */}
      <div className="border-border border-t pt-3">
        <TaskControls
          task={task}
          onLaunch={onLaunchWorkflow}
          onRetry={onRestartCheckpoint}
          onRun={onApproveAndExecute}
          onStop={onKillAgent}
        />
      </div>
    </div>
  );
}
