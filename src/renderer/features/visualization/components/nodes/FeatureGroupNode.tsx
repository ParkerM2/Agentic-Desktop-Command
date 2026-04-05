import { Badge, StatusIndicator } from '@ui';

import { useVisualizationStore } from '../../store';

import type { FeatureGroupNode as FeatureGroupRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

function statusVariant(
  status: string,
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
    default: {
      return 'neutral';
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
        <StatusIndicator
          label={data.status}
          size="sm"
          variant={statusVariant(data.status)}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge className="shrink-0 text-xs" variant="secondary">
          {data.agentCount} agent{data.agentCount === 1 ? '' : 's'}
        </Badge>
        {data.branch !== null && (
          <span className="truncate font-mono opacity-70">{data.branch}</span>
        )}
      </div>
    </div>
  );
}
