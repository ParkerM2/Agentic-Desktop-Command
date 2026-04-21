import { useAllAgents, useStopAgent } from '../../api/useAgents';
import { useAgentEvents } from '../../hooks/useAgentEvents';

interface UseAgentDashboardReturn {
  sessions: ReturnType<typeof useAllAgents>['data'];
  isLoading: boolean;
  stopAgent: ReturnType<typeof useStopAgent>;
}

export function useAgentDashboard(): UseAgentDashboardReturn {
  const { data: sessions, isLoading } = useAllAgents();
  const stopAgent = useStopAgent();

  useAgentEvents();

  return { sessions, isLoading, stopAgent };
}
