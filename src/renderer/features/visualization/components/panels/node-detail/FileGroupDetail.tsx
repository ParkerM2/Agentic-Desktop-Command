/**
 * FileGroupDetail — detail view for a file-group node.
 */

import { MetadataItem, MetadataList } from '@ui';

import type { FileGroupData } from '../../../lib/graph-builders';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FileGroupDetailProps {
  data: FileGroupData;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FileGroupDetail({ data }: FileGroupDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <MetadataList>
        <MetadataItem label="Group" value={data.label} />
        <MetadataItem label="Files" value={data.fileCount} />
      </MetadataList>
    </div>
  );
}
