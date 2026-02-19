/**
 * DonePanel — Full summary card for completed tasks.
 * Shows plan, QA report, PR status, subtasks, and timing stats.
 */

import { Calendar, CheckCircle2, Clock } from 'lucide-react';

import type { Task } from '@shared/types';

import { formatDuration, formatRelativeTime } from '@renderer/shared/lib/utils';

import { PRStatusPanel } from '@features/tasks/components/detail/PrStatusPanel';
import { QaReportViewer } from '@features/tasks/components/detail/QaReportViewer';
import { SubtaskList } from '@features/tasks/components/detail/SubtaskList';

import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface DonePanelProps {
  task: Task;
}

function computeDuration(createdAt: string, updatedAt: string): string {
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return '0s';
  return formatDuration(diffMs);
}

export function DonePanel({ task }: DonePanelProps) {
  const planContent = task.metadata?.planContent as string | undefined;

  return (
    <div className="space-y-4">
      {/* Completion header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
        <span className="text-success text-sm font-medium">Task Completed</span>
      </div>

      {/* Timing stats */}
      <div className="border-border flex items-center gap-4 rounded-md border p-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground text-xs">
            Created {formatRelativeTime(task.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground text-xs">
            Completed {formatRelativeTime(task.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground text-xs">
            Duration: {computeDuration(task.createdAt, task.updatedAt)}
          </span>
        </div>
      </div>

      {/* Plan content */}
      {planContent ? (
        <div className="space-y-1.5">
          <div className="text-muted-foreground text-xs font-medium">Plan</div>
          <div className="border-border max-h-64 overflow-y-auto rounded-md border p-3">
            <MarkdownRenderer content={planContent} />
          </div>
        </div>
      ) : null}

      {/* QA Report */}
      <QaReportViewer taskId={task.id} />

      {/* PR Status */}
      <PRStatusPanel prStatus={task.prStatus} prUrl={task.metadata?.prUrl} />

      {/* Subtask list */}
      {task.subtasks.length > 0 ? <SubtaskList subtasks={task.subtasks} /> : null}
    </div>
  );
}
