import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FileCode } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import type { FileNode as FileRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

const EXT_COLORS: Record<string, string> = {
  '.tsx': 'bg-blue-500/20 text-blue-400',
  '.ts': 'bg-slate-500/20 text-slate-400',
  '.js': 'bg-yellow-500/20 text-yellow-400',
  '.jsx': 'bg-orange-500/20 text-orange-400',
};

export function FileNode({ data }: NodeProps<FileRFNode>) {
  const { getViewport } = useReactFlow();
  const { zoom } = getViewport();
  const extColor = EXT_COLORS[data.ext] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="min-w-32 rounded border border-border/50 bg-background/90 px-2 py-1.5">
      <Handle position={Position.Top} type="target" />

      <div className="flex items-center gap-1.5">
        <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs">{data.label}</span>
        <span
          className={cn(
            'ml-auto shrink-0 rounded px-1 py-0.5 text-[10px] font-medium',
            extColor,
          )}
        >
          {data.ext}
        </span>
      </div>

      {zoom >= 0.5 && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          <span>{data.relativePath}</span>
          {data.importCount > 0 && (
            <span className="ml-2 text-muted-foreground/70">
              {data.importCount} import{data.importCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}
