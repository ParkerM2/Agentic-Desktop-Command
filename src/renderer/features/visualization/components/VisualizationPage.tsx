import { ReactFlowProvider } from '@xyflow/react';

import { useLooseParams } from '@renderer/shared/hooks';

import { PageHeader, PageLayout } from '@ui';

import { VisualizationCanvas } from './canvas/VisualizationCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';

export function VisualizationPage() {
  const params = useLooseParams();
  const projectId = params.projectId ?? '';

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Codebase structure and agent activity">
            Visual Map
          </PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>
      <div className="relative flex-1">
        <ReactFlowProvider>
          <VisualizationCanvas projectId={projectId} />
          <NodeDetailPanel projectId={projectId} />
        </ReactFlowProvider>
      </div>
    </PageLayout>
  );
}
