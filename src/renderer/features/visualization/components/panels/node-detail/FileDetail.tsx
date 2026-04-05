/**
 * FileDetail — detail view for a file node.
 */

import type { FileNodeData } from '../../../lib/graph-builders';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FileDetailProps {
  data: FileNodeData;
  exports: string[];
  imports: string[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FileDetail({ data, exports, imports }: FileDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Path</p>
        <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
          {data.relativePath}
        </code>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Group</p>
        <p className="text-sm">{data.group}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Import count</p>
        <p className="text-sm">{data.importCount}</p>
      </div>

      {imports.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Imports from</p>
          <ul className="space-y-0.5">
            {imports.map((imp) => (
              <li key={imp}>
                <code className="block truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {imp}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {exports.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Exported to</p>
          <ul className="space-y-0.5">
            {exports.map((exp) => (
              <li key={exp}>
                <code className="block truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {exp}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
