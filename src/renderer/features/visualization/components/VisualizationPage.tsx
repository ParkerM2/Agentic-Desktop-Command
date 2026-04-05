import { ReactFlowProvider } from '@xyflow/react';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { useLooseParams } from '@renderer/shared/hooks';

import { VisualizationCanvas } from './canvas/VisualizationCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';

export function VisualizationPage() {
  const params = useLooseParams();
  const projectId = params.projectId ?? '';

  return (
    <PageLayout>
      <PageHeader description="Codebase structure and agent activity" title="Visual Map" />
      <PageContent className="h-full flex-1 p-0">
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
