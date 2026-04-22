import { useToday } from '@renderer/shared/hooks/useToday';

import { useAllAgents } from '@features/agents';
import { useAllTasks } from '@features/my-work';

import { useCaptures } from '../../api/useCaptures';

export function useDailyStats() {
  const { data: captures } = useCaptures();
  const { data: allSessions } = useAllAgents();
  const { data: tasks } = useAllTasks();

  const captureCount = captures?.length ?? 0;
  const todayStr = useToday();

  const tasksCompleted =
    tasks?.filter((task) => task.status === 'done' && task.updatedAt.startsWith(todayStr)).length ??
    0;

  const sessionList = Array.isArray(allSessions) ? allSessions : [];
  const agentsRan = sessionList.filter((s) => s.startedAt.startsWith(todayStr)).length;

  return { captureCount, tasksCompleted, agentsRan };
}
