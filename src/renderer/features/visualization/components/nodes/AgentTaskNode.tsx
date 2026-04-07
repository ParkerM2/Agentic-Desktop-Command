import { Handle, NodeToolbar, Position } from '@xyflow/react';

import { Button, StatusIndicator } from '@ui';

import { useVisualizationStore } from '../../store';

import type { AgentStatus, AgentTaskNode as AgentTaskRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

export type { AgentStatus };

function relativeTime(ts: string | null): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function statusVariant(
  status: AgentStatus,
): 'success' | 'error' | 'warning' | 'neutral' {
  switch (status) {
    case 'active': {
      return 'warning';
    }
    case 'completed': {
      return 'success';
    }
    case 'error': {
      return 'error';
    }
    case 'idle':
    case 'pending': {
      return 'neutral';
    }
  }
}

export function AgentTaskNode({ id, data, selected }: NodeProps<AgentTaskRFNode>) {
  const openDetailPanel = useVisualizationStore((s) => s.openDetailPanel);
  const timeAgo = relativeTime(data.lastEventTs ?? null);

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div className="flex gap-1 rounded-md border border-border bg-background p-1 shadow-md">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              openDetailPanel(id);
            }}
          >
            Details
          </Button>
        </div>
      </NodeToolbar>

      <Handle position={Position.Top} type="target" />
      <div
        aria-label={`Agent task: ${data.agentName}`}
        role="button"
        tabIndex={0}
        className={[
          'min-w-[180px] rounded-md border bg-background/95 px-3 py-2 shadow-sm',
          selected ? 'ring-2 ring-primary' : '',
        ].join(' ')}
        onClick={() => {
          openDetailPanel(id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetailPanel(id);
          }
        }}
      >
        <div className="mb-1 flex items-center gap-2">
          <StatusIndicator
            aria-hidden="true"
            size="sm"
            variant={statusVariant(data.status)}
          />
          <span className="truncate text-sm font-medium">{data.agentName}</span>
        </div>
        {data.taskName !== null && (
          <p className="mb-1 truncate text-xs text-muted-foreground">{data.taskName}</p>
        )}
        <div className="flex items-center justify-between gap-1 text-xs">
          <StatusIndicator
            label={data.status}
            size="sm"
            variant={statusVariant(data.status)}
          />
          {timeAgo !== '' && <span className="text-muted-foreground">{timeAgo}</span>}
        </div>
        {data.wave !== null && (
          <div className="mt-1 text-xs text-muted-foreground">Wave {data.wave}</div>
        )}
      </div>
      <Handle position={Position.Bottom} type="source" />
    </>
  );
}
