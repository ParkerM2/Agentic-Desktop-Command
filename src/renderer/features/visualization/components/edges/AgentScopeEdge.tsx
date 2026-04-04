import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';

type AgentScopeEdgeType = Edge<{ isLive: boolean }, 'agentScope'>;

export function AgentScopeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<AgentScopeEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isLive = data?.isLive ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: 'var(--primary)',
          strokeWidth: 1.5,
          strokeOpacity: 0.7,
          strokeDasharray: '6 3',
          animation: isLive ? 'dash 1.5s linear infinite' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan text-xs text-muted-foreground bg-background/80 rounded px-1"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        />
      </EdgeLabelRenderer>
    </>
  );
}
