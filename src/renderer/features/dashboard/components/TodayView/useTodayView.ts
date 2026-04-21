import { useDay } from '@features/planner';

export function useTodayView() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: plan, isLoading } = useDay(todayStr);
  const timeBlocks = plan?.timeBlocks ?? [];

  return { timeBlocks, isLoading };
}
