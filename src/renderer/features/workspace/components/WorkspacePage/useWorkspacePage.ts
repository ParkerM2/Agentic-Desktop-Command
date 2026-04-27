import { useEffect } from 'react';

import { useLooseParams } from '@renderer/shared/hooks';

import { useAgentDashboardEvents } from '@features/agent-dashboard';
import { useProjects } from '@features/projects';

import { useWorkspaceInit, useWorkspaceSessions } from '../../api/useWorkspace';
import { useWorkspaceStore } from '../../store';

export function useWorkspacePage() {
  useAgentDashboardEvents();
  const { projectId } = useLooseParams();
  const { data: projects } = useProjects();
  const setViewing = useWorkspaceStore((s) => s.setViewingProject);

  const project = projects?.find((p) => p.id === projectId);
  const projectPath = project?.path ?? null;
  const projectName = project?.name ?? 'Project';

  useEffect(() => {
    if (projectId !== undefined) setViewing(projectId);
  }, [projectId, setViewing]);

  useWorkspaceInit(projectId ?? null, projectPath);

  const { data: sessions = [] } = useWorkspaceSessions(projectId ?? null);

  const primarySession = sessions.find((s) => s.key.type === 'primary');

  return {
    projectId,
    projectName,
    sessions,
    primarySession,
  };
}
