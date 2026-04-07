import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Layout,
  Package,
  Server,
  Share2,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

import { useVisualizationStore } from '../../store';

import type { FileGroupNode as FileGroupRFNode } from '../../lib/graph-builders';
import type { NodeProps } from '@xyflow/react';

// ─── Layer icon mapping ──────────────────────────────────────────

const LAYER_ICONS: Record<string, typeof Server> = {
  main: Server,
  renderer: Layout,
  shared: Share2,
  features: Package,
  preload: Package,
};

// ─── Layer background tints (low opacity theme-compatible) ───────

const LAYER_BG: Record<string, string> = {
  main: 'bg-blue-500/5',
  renderer: 'bg-purple-500/5',
  shared: 'bg-emerald-500/5',
  features: 'bg-amber-500/5',
  preload: 'bg-slate-500/5',
};

const LAYER_BORDER: Record<string, string> = {
  main: 'border-blue-500/30',
  renderer: 'border-purple-500/30',
  shared: 'border-emerald-500/30',
  features: 'border-amber-500/30',
  preload: 'border-slate-500/30',
};

export function FileGroupNode({ id, data }: NodeProps<FileGroupRFNode>) {
  const { getViewport } = useReactFlow();
  const { zoom } = getViewport();
  const { expandedGroups, toggleExpandedGroup } = useVisualizationStore();
  const isExpanded = expandedGroups.has(id);

  const isParent = data.isParent === true;
  const parentLayer = data.parentLayer ?? '';
  const LayerIcon = LAYER_ICONS[parentLayer] ?? FolderOpen;
  const layerBg = LAYER_BG[parentLayer] ?? '';
  const layerBorder = LAYER_BORDER[parentLayer] ?? 'border-border/60';

  return (
    <div
      className={cn(
        'min-w-40 rounded-md border backdrop-blur-sm',
        isParent
          ? cn(
              'min-w-52 border-2 font-semibold',
              layerBorder,
              layerBg,
              'bg-card/90',
            )
          : cn('border-border/60 bg-card/80', layerBg),
      )}
    >
      <Handle position={Position.Top} type="target" />

      <div
        className={cn(
          'flex items-center gap-1.5 px-2',
          isParent ? 'py-2.5' : 'py-1.5',
        )}
      >
        {isParent ? null : (
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
        )}

        <LayerIcon
          className={cn(
            'shrink-0',
            isParent
              ? 'h-5 w-5 text-foreground/70'
              : 'h-4 w-4 text-muted-foreground',
          )}
        />

        <span
          className={cn(
            'truncate',
            isParent ? 'text-sm font-semibold' : 'text-xs font-medium',
          )}
        >
          {data.label}
        </span>

        {zoom >= 0.5 ? (
          <span
            className={cn(
              'ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground',
              isParent ? 'text-xs' : 'text-[10px]',
            )}
          >
            {data.fileCount}
          </span>
        ) : null}
      </div>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}
