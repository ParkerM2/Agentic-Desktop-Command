/**
 * DailyStats — Simple stats row showing daily activity
 */

import { useAllAgents } from '@features/agents';

import { useDashboardStore } from '../store';

export function DailyStats() {
  const captureCount = useDashboardStore((s) => s.quickCaptures.length);
  const { data: allAgents } = useAllAgents();

  // TODO: Wire tasksCompleted when task tracking is available
  const tasksCompleted = 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const agentsRan =
    allAgents?.filter((agent) => agent.startedAt.startsWith(todayStr)).length ?? 0;

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
