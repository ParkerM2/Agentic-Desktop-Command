import type { NodeProps } from '@xyflow/react';

import { Badge } from '@ui';
import type { FeatureGroupNode as FeatureGroupRFNode } from '../../lib/graph-builders';
import { useVisualizationStore } from '../../store';

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
  const feature = data.feature ?? data.label;

  return (
    <div
      className={[
        'min-w-[160px] rounded-lg border bg-background/90 p-3 shadow-sm',
        selected ? 'ring-2 ring-primary' : '',
      ].join(' ')}
      role="button"
      tabIndex={0}
      aria-label={`Feature group: ${feature}`}
      onClick={() => {
        toggleExpandedGroup(feature);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpandedGroup(feature);
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{feature}</span>
        <Badge variant={statusBadgeVariant(data.status)} className="shrink-0 text-xs">
          {data.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {data.agentCount} agent{data.agentCount === 1 ? '' : 's'}
        </span>
        {data.branch !== null && data.branch !== undefined && (
          <span className="truncate font-mono opacity-70">{data.branch}</span>
        )}
      </div>
    </div>
  );
}
