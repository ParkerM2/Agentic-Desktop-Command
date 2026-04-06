/**
 * FeatureGroupDetail — detail view for a feature-group node.
 */

import { Badge, MetadataItem, MetadataList } from '@ui';

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
      <MetadataList>
        <MetadataItem label="Feature" value={data.feature} />
        <MetadataItem
          label="Status"
          value={<Badge variant={statusVariant(data.status)}>{data.status}</Badge>}
        />
        {data.branch !== null && (
          <MetadataItem
            label="Branch"
            value={
              <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
                {data.branch}
              </code>
            }
          />
        )}
        <MetadataItem label="Agents" value={data.agentCount} />
      </MetadataList>
    </div>
  );
}
