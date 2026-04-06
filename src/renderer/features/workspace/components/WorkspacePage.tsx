/**
 * WorkspacePage — Primary work area for each project.
 *
 * Left panel (55%): Primary Claude session.
 * Right column (45%): Team Lead sessions + spawn button.
 * Panels are resizable via drag handle.
 */

import { useEffect } from 'react';

import { Group, Panel, Separator } from 'react-resizable-panels';

import { useLooseParams } from '@renderer/shared/hooks';

import { PageHeader, PageLayout } from '@ui';


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
      <PageLayout>
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title>Workspace</PageHeader.Title>
          </PageHeader.Row>
        </PageHeader>
        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
          Open a project to start a workspace session.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Workspace</PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>

      <Group className="h-full" orientation="horizontal">
      {/* Primary Claude — left panel */}
      <Panel defaultSize={55} minSize={30}>
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
      </Panel>

      <Separator className="bg-border w-px cursor-col-resize transition-colors hover:bg-primary/30" />

      {/* Team Leads — right panel */}
      <Panel defaultSize={45} minSize={25}>
        <div className="h-full">
          <TeamLeadPanelList projectId={projectId} sessions={sessions} />
        </div>
      </Panel>
    </Group>
    </PageLayout>
  );
}
