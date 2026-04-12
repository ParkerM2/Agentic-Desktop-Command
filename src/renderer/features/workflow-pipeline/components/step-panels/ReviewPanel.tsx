/**
 * ReviewPanel — Shows QA report and PR status for tasks in review.
 */

import type { ProgressTask } from '@shared/types/progress';

import { PRStatusPanel } from '@features/tasks/components/detail/PrStatusPanel';
import { QaReportViewer } from '@features/tasks/components/detail/QaReportViewer';

interface ReviewPanelProps {
  task: ProgressTask;
}

export function ReviewPanel({ task }: ReviewPanelProps) {
  return (
    <div className="space-y-4">
      {/* QA Report */}
      <QaReportViewer taskId={task.slug} />

      {/* PR Status */}
      <PRStatusPanel prStatus={undefined} prUrl={task.prUrl} />
    </div>
  );
}
