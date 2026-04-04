import dagre from '@dagrejs/dagre';
import { Position } from '@xyflow/react';

import type { Edge, Node } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 60;

export function getLayoutedElements<N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[],
  direction: 'TB' | 'LR' = 'TB',
  nodeWidth = DEFAULT_NODE_WIDTH,
  nodeHeight = DEFAULT_NODE_HEIGHT,
): { nodes: N[]; edges: E[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.measured?.width ?? nodeWidth,
      height: node.measured?.height ?? nodeHeight,
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const isHorizontal = direction === 'LR';

  return {
    edges,
    nodes: nodes.map((node) => {
      const { x, y, width, height } = g.node(node.id);
      return {
        ...node,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        position: {
          x: x - width / 2,
          y: y - height / 2,
        },
      } as N;
    }),
  };
}
