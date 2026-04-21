import { useQaSession } from '../../api/useQaSession';
import { useQaEvents } from '../../hooks/useQaEvents';

interface UseQaPanelParams {
  taskId?: string;
}

interface UseQaPanelReturn {
  session: ReturnType<typeof useQaSession>['data'];
  isLoading: boolean;
}

export function useQaPanel({ taskId }: UseQaPanelParams): UseQaPanelReturn {
  const { data: session, isLoading } = useQaSession(taskId);

  useQaEvents();

  return { session, isLoading };
}
