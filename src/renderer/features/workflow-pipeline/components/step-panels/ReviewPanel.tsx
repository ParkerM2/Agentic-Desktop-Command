/**
 * ReviewPanel — Shows QA report and PR status for tasks in review.
 */

import type { Task } from '@shared/types';

import { PRStatusPanel } from '@features/tasks/components/detail/PrStatusPanel';
import { QaReportViewer } from '@features/tasks/components/detail/QaReportViewer';

interface ReviewPanelProps {
  task: Task;
}

export function ReviewPanel({ task }: ReviewPanelProps) {
  return (
    <div className="space-y-4">
      {/* QA Report */}
      <QaReportViewer taskId={task.id} />

      {/* PR Status */}
      <PRStatusPanel prStatus={task.prStatus} prUrl={task.metadata?.prUrl} />
    </div>
  );
}
