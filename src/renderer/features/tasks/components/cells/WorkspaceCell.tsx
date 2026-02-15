/**
 * WorkspaceCell — AG-Grid cell renderer for workspace name + online/offline dot.
 */

import { cn } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

interface WorkspaceData {
  name?: string;
  isOnline?: boolean;
}

export function WorkspaceCell(props: CustomCellRendererProps) {
  const raw = props.value as WorkspaceData | string | null | undefined;

  if (raw === null || raw === undefined) {
    return <span className="text-muted-foreground text-sm">&mdash;</span>;
  }

  const name = typeof raw === 'string' ? raw : (raw.name ?? '');
  const isOnline = typeof raw === 'string' ? false : raw.isOnline === true;

  if (name === '') {
    return <span className="text-muted-foreground text-sm">&mdash;</span>;
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <span
        title={isOnline ? 'Online' : 'Offline'}
        className={cn(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          isOnline ? 'bg-success' : 'bg-muted-foreground',
        )}
      />
      <span className="truncate text-sm">{name}</span>
    </div>
  );
}
