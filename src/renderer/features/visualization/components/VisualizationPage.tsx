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
      <PageHeader description="Codebase structure and agent activity" title="Visual Map" />
      <div style={{ height: 'calc(100vh - 120px)', position: 'relative' }}>
        <ReactFlowProvider>
          <VisualizationCanvas projectId={projectId} />
          <NodeDetailPanel projectId={projectId} />
        </ReactFlowProvider>
      </div>
    </PageLayout>
  );
}
