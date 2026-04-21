import { useMemo } from 'react';

import { useProjects } from '@features/projects/api/useProjects';

import { useAllAgents, useStopAgent } from '../../api/useAgents';
import { useAgentEvents } from '../../hooks/useAgentEvents';

interface UseAgentDashboardReturn {
  sessions: ReturnType<typeof useAllAgents>['data'];
  isLoading: boolean;
  stopAgent: ReturnType<typeof useStopAgent>;
  projectNameMap: Map<string, string>;
}

export function useAgentDashboard(): UseAgentDashboardReturn {
  const { data: sessions, isLoading } = useAllAgents();
  const stopAgent = useStopAgent();
  const { data: projects } = useProjects();

  useAgentEvents();

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (projects) {
      for (const p of projects) {
        map.set(p.id, p.name);
      }
    }
    return map;
  }, [projects]);

  return { sessions, isLoading, stopAgent, projectNameMap };
}
