import { useTasksForFeature } from '../../api/useTaskProgress';
import { useProgressEvents } from '../../hooks/useProgressEvents';

interface UseTasksTabParams {
  featureSlug: string;
  taskId?: string;
}

interface UseTasksTabReturn {
  tasks: ReturnType<typeof useTasksForFeature>['data'];
  isLoading: boolean;
}

export function useTasksTab({ featureSlug }: UseTasksTabParams): UseTasksTabReturn {
  const { data: tasks, isLoading } = useTasksForFeature(featureSlug);

  useProgressEvents();

  return { tasks, isLoading };
}
