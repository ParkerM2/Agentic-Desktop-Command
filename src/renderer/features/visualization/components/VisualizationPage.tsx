import { useParams } from '@tanstack/react-router';
import { ReactFlowProvider } from '@xyflow/react';

import { ROUTE_PATTERNS } from '@shared/constants';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { VisualizationCanvas } from './canvas/VisualizationCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';

export function VisualizationPage() {
  const { projectId } = useParams({ from: ROUTE_PATTERNS.PROJECT_VISUALIZATION });
  return (
    <PageLayout>
      <PageHeader description="Codebase structure and agent activity" title="Visual Map" />
      <PageContent className="p-0 h-full flex flex-col">
        <ReactFlowProvider>
          <div className="relative flex-1">
            <VisualizationCanvas projectId={projectId} />
            <NodeDetailPanel projectId={projectId} />
          </div>
        </ReactFlowProvider>
      </PageContent>
    </PageLayout>
  );
}
