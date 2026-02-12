/**
 * DailyStats — Simple stats row showing daily activity
 */

import { useDashboardStore } from '../store';

export function DailyStats() {
  const captureCount = useDashboardStore((s) => s.quickCaptures.length);

  // Mock values for tasks and agents until real data is available
  const tasksCompleted = 0;
  const agentsRan = 2;

  return (
    <div className="bg-card border-border rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-medium">{tasksCompleted}</span> tasks completed
        {' \u00B7 '}
        <span className="text-foreground font-medium">{agentsRan}</span> agents ran
        {' \u00B7 '}
        <span className="text-foreground font-medium">{captureCount}</span> captures
      </p>
    </div>
  );
}
