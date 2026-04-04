import type { NodeProps } from '@xyflow/react';

import { Handle, Position } from '@xyflow/react';

import type { AgentStatus, AgentTaskNode as AgentTaskRFNode } from '../../lib/graph-builders';
import { useVisualizationStore } from '../../store';

function relativeTime(ts: string | null): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function statusTextClass(status: AgentStatus): string {
  switch (status) {
    case 'active': {
      return 'text-primary';
    }
    case 'completed': {
      return 'text-green-500';
    }
    case 'error': {
      return 'text-destructive';
    }
    default: {
      return 'text-muted-foreground';
    }
  }
}

export function GuardianNode({ id, data, selected }: NodeProps<AgentTaskRFNode>) {
  const openDetailPanel = useVisualizationStore((s) => s.openDetailPanel);
  const timeAgo = relativeTime(data.lastEventTs ?? null);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className={[
          'min-w-[180px] rounded-md border-2 border-primary/40 bg-primary/5 px-3 py-2 shadow-sm',
          selected ? 'ring-2 ring-primary' : '',
        ].join(' ')}
        role="button"
        tabIndex={0}
        aria-label={`Guardian agent: ${data.agentName}`}
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
          <span
            className={[
              'inline-block h-2 w-2 shrink-0 rounded-full',
              data.status === 'active' ? 'animate-pulse bg-primary' : 'bg-muted-foreground',
            ].join(' ')}
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold">{data.agentName}</span>
          <span className="ml-auto shrink-0 rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
            QA
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 text-xs">
          <span className={statusTextClass(data.status)}>{data.status}</span>
          {timeAgo !== '' && <span className="text-muted-foreground">{timeAgo}</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}
