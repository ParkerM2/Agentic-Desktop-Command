/**
 * GitPage — Source control dashboard with Local and GitHub tabs.
 *
 * Local tab: GitStatusCard, BranchList, WorktreeList, CommitPanel.
 * GitHub tab: GitHubPanel (existing integration).
 *
 * repoPath is derived from the active project via the $projectId route param.
 */

import { useLooseParams } from '@renderer/shared/hooks';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { GitHubPanel } from '@features/integrations';
import { useProjects } from '@features/projects';

import { BranchList } from './BranchList';
import { CommitHistory } from './CommitHistory';
import { CommitPanel } from './CommitPanel';
import { GitStatusCard } from './GitStatusCard';
import { WorktreeList } from './WorktreeList';

export function GitPage() {
  const { projectId } = useLooseParams();
  const { data: projects } = useProjects();
  const project = projects?.find((p) => p.id === projectId);
  const repoPath = project?.path ?? null;

  return (
    <PageLayout>
      <PageHeader.Tabs defaultValue="local">
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Source control and version management">
              Git
            </PageHeader.Title>
          </PageHeader.Row>
          <PageHeader.TabList>
            <PageHeader.Tab value="local">Local</PageHeader.Tab>
            <PageHeader.Tab value="history">History</PageHeader.Tab>
            <PageHeader.Tab value="github">GitHub</PageHeader.Tab>
          </PageHeader.TabList>
        </PageHeader>
        <PageContent>
          <PageHeader.TabContent value="local">
            {repoPath === null ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Open a project to view git status.
              </div>
            ) : (
              <div className="space-y-4">
                <GitStatusCard repoPath={repoPath} />
                <BranchList repoPath={repoPath} />
                <WorktreeList projectId={projectId ?? ''} repoPath={repoPath} />
                <CommitPanel projectId={projectId ?? ''} repoPath={repoPath} />
              </div>
            )}
          </PageHeader.TabContent>
          <PageHeader.TabContent value="history">
            {repoPath === null ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Open a project to view commit history.
              </div>
            ) : (
              <CommitHistory repoPath={repoPath} />
            )}
          </PageHeader.TabContent>
          <PageHeader.TabContent value="github">
            <GitHubPanel />
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}
