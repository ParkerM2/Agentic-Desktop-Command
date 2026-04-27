import { useTasksForFeature } from '../../api/useTaskProgress';
import { useAsyncRender } from '../../hooks/useAsyncRender';
import { useProgressEvents } from '../../hooks/useProgressEvents';

interface UseTasksTabParams {
  featureSlug: string;
  taskId?: string;
}

export function useTasksTab({ featureSlug }: UseTasksTabParams) {
  const query = useTasksForFeature(featureSlug);
  const { data: tasks, isLoading, isEmpty } = useAsyncRender(query);

  useProgressEvents();

  return { tasks, isLoading, isEmpty };
}
