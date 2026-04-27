import { useToday } from '@renderer/shared/hooks/useToday';

import { useDay } from '@features/planner';

export function useTodayView() {
  const todayStr = useToday();
  const { data: plan, isLoading } = useDay(todayStr);
  const timeBlocks = plan?.timeBlocks ?? [];

  return { timeBlocks, isLoading };
}
