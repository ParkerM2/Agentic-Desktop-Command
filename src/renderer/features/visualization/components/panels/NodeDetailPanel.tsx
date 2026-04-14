/**
 * NodeDetailPanel — slide-in detail panel for selected canvas nodes.
 * Shows different content based on node type: file, fileGroup, agentTask, or guardian.
 */

import { useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Card, ScrollArea } from '@ui';

import { useAgentTeams } from '../../api/useVisualization';
import { useVisualizationStore } from '../../store';

import { getPanelTitle, renderNodeContent } from './node-detail/node-content';

import type { TrackingEvent } from './node-detail/types';
import type { Node } from '@xyflow/react';

// ─── Props ──────────────────────────────────────────────────────────────────

interface NodeDetailPanelProps {
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NodeDetailPanel({ projectId }: NodeDetailPanelProps) {
  const { closeDetailPanel, detailPanelOpen, selectedFeature, selectedNodeId } =
    useVisualizationStore();

  const { getEdges, getNode } = useReactFlow();

  const node: Node | undefined =
    selectedNodeId === null ? undefined : getNode(selectedNodeId);

  const { data: agentTeamsData, isLoading: agentTeamsLoading } = useAgentTeams(projectId);

  const featureName = selectedFeature ?? agentTeamsData?.features[0]?.feature ?? '';
  const featureData = agentTeamsData?.features.find((f) => f.feature === featureName);
  const featureEvents: TrackingEvent[] = featureData?.events ?? [];

  function getFileEdges(nodePath: string) {
    const edges = getEdges();
    const imports = edges.filter((e) => e.source === nodePath).map((e) => e.target);
    const exports = edges.filter((e) => e.target === nodePath).map((e) => e.source);
    return { exports, imports };
  }

  const shouldRender = selectedNodeId !== null && detailPanelOpen && node !== undefined;

  return (
    <aside
      aria-hidden={!detailPanelOpen}
      aria-label="Node detail panel"
      className={cn(
        'absolute top-0 right-0 z-10 h-full w-[380px] border-l border-border shadow-xl',
        'flex flex-col',
        'transition-transform duration-300',
        detailPanelOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <Card className="flex h-full flex-col rounded-none border-0">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3 className="truncate text-sm font-semibold">{getPanelTitle(node)}</h3>
          <Button
            aria-label="Close detail panel"
            size="icon"
            variant="ghost"
            onClick={closeDetailPanel}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {shouldRender ? (
          <ScrollArea className="flex-1">
            {renderNodeContent(node, {
              featureEvents,
              agentTeamsLoading,
              featureName,
              projectId,
              getFileEdges,
            })}
          </ScrollArea>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground">Select a node to view details</p>
          </div>
        )}
      </Card>
    </aside>
  );
}
