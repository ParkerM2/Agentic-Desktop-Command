/**
 * TestPhasePanel — placeholder scaffold for a task's Test Phase tab.
 *
 * Wave 9 of the Test Suite plan replaces this with real test-selection
 * and run UI that attaches results to the task review record.
 */

import { PageContent } from '@ui';

interface TestPhasePanelProps {
  taskId: string;
}

export function TestPhasePanel({ taskId }: TestPhasePanelProps) {
  return (
    <PageContent>
      <div className="p-6 text-text-muted">Test Phase for {taskId} (placeholder)</div>
    </PageContent>
  );
}
