import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react';

import { useVisualizationStore } from '../../store';

import type { EdgeProps } from '@xyflow/react';

export function DataFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const showEdgeLabels = useVisualizationStore((s) => s.showEdgeLabels);
  const weight = (data as { weight?: number } | undefined)?.weight;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        markerEnd={markerEnd}
        path={edgePath}
        style={{ stroke: 'var(--border)', strokeWidth: 1, strokeOpacity: 0.5 }}
      />
      {showEdgeLabels && weight !== undefined ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)`,
            }}
          >
            {weight}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
