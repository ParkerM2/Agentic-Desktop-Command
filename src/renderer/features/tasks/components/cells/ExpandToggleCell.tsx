/**
 * ExpandToggleCell — AG-Grid cell renderer for row expand/collapse toggle.
 * Chevron rotates 90deg when expanded.
 */

import { ChevronRight } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

interface ExpandToggleCellProps extends CustomCellRendererProps {
  isExpanded?: boolean;
  onToggle?: (rowId: string) => void;
}

export function ExpandToggleCell(props: ExpandToggleCellProps) {
  const rowData = props.data as { id?: string } | undefined;
  const rowId = rowData?.id ?? '';
  const expanded = props.isExpanded === true;

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation();
    props.onToggle?.(rowId);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      props.onToggle?.(rowId);
    }
  }

  return (
    <div className="flex items-center justify-center py-1">
      <button
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse row' : 'Expand row'}
        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-colors"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <ChevronRight
          className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-90')}
        />
      </button>
    </div>
  );
}
