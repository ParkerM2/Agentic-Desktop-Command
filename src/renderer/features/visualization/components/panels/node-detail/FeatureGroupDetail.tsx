/**
 * FeatureGroupDetail — detail view for a feature-group node.
 */

import { Badge } from '@ui';

import { statusVariant } from './types';

import type { FeatureGroupData } from '../../../lib/graph-builders';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FeatureGroupDetailProps {
  data: FeatureGroupData;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeatureGroupDetail({ data }: FeatureGroupDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Feature</p>
        <p className="text-sm font-medium">{data.feature}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
      </div>
      {data.branch !== null && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Branch</p>
          <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
            {data.branch}
          </code>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Agents</p>
        <p className="text-sm">{data.agentCount}</p>
      </div>
    </div>
  );
}
