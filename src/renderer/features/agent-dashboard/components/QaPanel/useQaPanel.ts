import { useQaSession } from '../../api/useQaSession';
import { useAsyncRender } from '../../hooks/useAsyncRender';
import { useQaEvents } from '../../hooks/useQaEvents';

interface UseQaPanelParams {
  taskId?: string;
}

export function useQaPanel({ taskId }: UseQaPanelParams) {
  const query = useQaSession(taskId);
  const { data: session, isLoading, isEmpty } = useAsyncRender(query);

  useQaEvents();

  return { session, isLoading, isEmpty };
}
