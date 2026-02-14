/**
 * DailyStats — Simple stats row showing daily activity
 */

import { useLayoutStore } from '@renderer/shared/stores';

import { useAllAgents } from '@features/agents';
import { useTasks } from '@features/tasks';

import { useDashboardStore } from '../store';

export function DailyStats() {
  const captureCount = useDashboardStore((s) => s.quickCaptures.length);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: allAgents } = useAllAgents();
  const { data: tasks } = useTasks(activeProjectId);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Count tasks completed today (status 'done' with updatedAt starting with today's date)
  const tasksCompleted =
    tasks?.filter((task) => task.status === 'done' && task.updatedAt.startsWith(todayStr)).length ??
    0;
  const agentsRan = allAgents?.filter((agent) => agent.startedAt.startsWith(todayStr)).length ?? 0;

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
