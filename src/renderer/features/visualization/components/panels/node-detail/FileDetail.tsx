/**
 * FileDetail — detail view for a file node.
 */

import { MetadataItem, MetadataList } from '@ui';

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
      <MetadataList>
        <MetadataItem
          label="Path"
          value={
            <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {data.relativePath}
            </code>
          }
        />
        <MetadataItem label="Group" value={data.group} />
        <MetadataItem label="Import count" value={data.importCount} />
      </MetadataList>

      {imports.length > 0 && (
        <MetadataList>
          <MetadataItem
            label="Imports from"
            value={
              <ul className="space-y-0.5">
                {imports.map((imp) => (
                  <li key={imp}>
                    <code className="block truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                      {imp}
                    </code>
                  </li>
                ))}
              </ul>
            }
          />
        </MetadataList>
      )}

      {exports.length > 0 && (
        <MetadataList>
          <MetadataItem
            label="Exported to"
            value={
              <ul className="space-y-0.5">
                {exports.map((exp) => (
                  <li key={exp}>
                    <code className="block truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                      {exp}
                    </code>
                  </li>
                ))}
              </ul>
            }
          />
        </MetadataList>
      )}
    </div>
  );
}
