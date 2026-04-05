
import { Badge } from '@ui';

import { useVisualizationStore } from '../../store';

import type { FeatureGroupNode as FeatureGroupRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': {
      return 'default';
    }
    case 'completed': {
      return 'secondary';
    }
    case 'error': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}

export function FeatureGroupNode({ data, selected }: NodeProps<FeatureGroupRFNode>) {
  const toggleExpandedGroup = useVisualizationStore((s) => s.toggleExpandedGroup);

  return (
    <div
      aria-label={`Feature group: ${data.feature}`}
      role="button"
      tabIndex={0}
      className={[
        'min-w-[160px] rounded-lg border bg-background/90 p-3 shadow-sm',
        selected ? 'ring-2 ring-primary' : '',
      ].join(' ')}
      onClick={() => {
        toggleExpandedGroup(data.feature);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpandedGroup(data.feature);
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{data.feature}</span>
        <Badge className="shrink-0 text-xs" variant={statusBadgeVariant(data.status)}>
          {data.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {data.agentCount} agent{data.agentCount === 1 ? '' : 's'}
        </span>
        {data.branch !== null && (
          <span className="truncate font-mono opacity-70">{data.branch}</span>
        )}
      </div>
    </div>
  );
}
