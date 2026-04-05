/**
 * FileGroupDetail — detail view for a file-group node.
 */

import type { FileGroupData } from '../../../lib/graph-builders';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FileGroupDetailProps {
  data: FileGroupData;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FileGroupDetail({ data }: FileGroupDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Group</p>
        <p className="text-sm">{data.label}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Files</p>
        <p className="text-sm">{data.fileCount}</p>
      </div>
    </div>
  );
}
