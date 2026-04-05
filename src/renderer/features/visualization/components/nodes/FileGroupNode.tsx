import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

import { useVisualizationStore } from '../../store';

import type { FileGroupNode as FileGroupRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

export function FileGroupNode({ id, data }: NodeProps<FileGroupRFNode>) {
  const { getViewport } = useReactFlow();
  const { zoom } = getViewport();
  const { expandedGroups, toggleExpandedGroup } = useVisualizationStore();
  const isExpanded = expandedGroups.has(id);

  return (
    <div
      className={cn(
        'min-w-40 rounded-md border border-border/60 bg-card/80 backdrop-blur-sm',
      )}
    >
      <Handle position={Position.Top} type="target" />

      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Button
          aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
          className="h-5 w-5 shrink-0"
          size="icon"
          variant="ghost"
          onClick={() => {
            toggleExpandedGroup(id);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />

        <span className="truncate text-xs font-medium">{data.label}</span>

        {zoom >= 0.5 && (
          <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {data.fileCount}
          </span>
        )}
      </div>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}
