/**
 * WorkspacePage — Primary work area for each project.
 *
 * Left panel (55%): Primary Claude session.
 * Right column (45%): Team Lead sessions + spawn button.
 *
 * Calls initProject on mount. View is purely state-based — sessions
 * persist in WorkspaceSessionManager regardless of which project is displayed.
 */

import { useEffect } from 'react';

import { useLooseParams } from '@renderer/shared/hooks';

import { useAgentDashboardEvents } from '@features/agent-dashboard';
import { useProjects } from '@features/projects';

import { useWorkspaceInit, useWorkspaceSessions } from '../api/useWorkspace';
import { useWorkspaceStore } from '../store';

import { PrimarySessionPanel } from './PrimarySessionPanel';
import { TeamLeadPanelList } from './TeamLeadPanelList';

export function WorkspacePage() {
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

  if (projectId === undefined) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Open a project to start a workspace session.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Primary Claude — left 55% */}
      <div className="min-w-0 flex-[55]">
        {primarySession === undefined ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Starting primary session…
          </div>
        ) : (
          <PrimarySessionPanel
            projectId={projectId}
            projectName={projectName}
            sessionId={primarySession.agentSessionId}
            status={primarySession.status}
          />
        )}
      </div>

      {/* Team Leads — right 45% */}
      <div className="border-border min-w-0 flex-[45] border-l">
        <TeamLeadPanelList projectId={projectId} sessions={sessions} />
      </div>
    </div>
  );
}
