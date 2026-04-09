/**
 * DailyStats — Simple stats row showing daily activity
 *
 * Shows task completions across all projects (not just active project).
 */

import { Card, CardContent } from '@ui';

import { useAllAgents } from '@features/agents';
import { useAllTasks } from '@features/my-work';

import { useCaptures } from '../api/useCaptures';

export function DailyStats() {
  const { data: captures } = useCaptures();
  const { data: allSessions } = useAllAgents();
  const { data: tasks } = useAllTasks();

  const captureCount = captures?.length ?? 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Count tasks completed today (status 'done' with updatedAt starting with today's date)
  const tasksCompleted =
    tasks?.filter((task) => task.status === 'done' && task.updatedAt.startsWith(todayStr)).length ??
    0;

  // Count agent sessions started today
  const sessionList = Array.isArray(allSessions) ? allSessions : [];
  const agentsRan = sessionList.filter((s) => s.startedAt.startsWith(todayStr)).length;

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">{tasksCompleted}</span> tasks completed
          {' \u00B7 '}
          <span className="text-foreground font-medium">{agentsRan}</span> agents ran
          {' \u00B7 '}
          <span className="text-foreground font-medium">{captureCount}</span> captures
        </p>
      </CardContent>
    </Card>
  );
}
