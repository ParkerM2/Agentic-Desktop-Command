import { Handle, Position } from '@xyflow/react';

import { StatusIndicator } from '@ui';

import { useVisualizationStore } from '../../store';

import type { AgentStatus, AgentTaskNode as AgentTaskRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

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
): 'success' | 'warning' | 'error' | 'neutral' {
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

export function GuardianNode({ id, data, selected }: NodeProps<AgentTaskRFNode>) {
  const openDetailPanel = useVisualizationStore((s) => s.openDetailPanel);
  const timeAgo = relativeTime(data.lastEventTs ?? null);

  return (
    <>
      <Handle position={Position.Top} type="target" />
      <div
        aria-label={`Guardian agent: ${data.agentName}`}
        role="button"
        tabIndex={0}
        className={[
          'min-w-[180px] rounded-md border-2 border-primary/40 bg-primary/5 px-3 py-2 shadow-sm',
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
          <span className="truncate text-sm font-semibold">{data.agentName}</span>
          <span className="ml-auto shrink-0 rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
            QA
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 text-xs">
          <StatusIndicator
            label={data.status}
            size="sm"
            variant={statusVariant(data.status)}
          />
          {timeAgo !== '' && <span className="text-muted-foreground">{timeAgo}</span>}
        </div>
      </div>
      <Handle position={Position.Bottom} type="source" />
    </>
  );
}
