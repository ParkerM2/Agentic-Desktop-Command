/**
 * TitleCell — AG-Grid cell renderer for bold truncated task title.
 * Full title shown on hover via title attribute.
 */

import type { CustomCellRendererProps } from 'ag-grid-react';

export function TitleCell(props: CustomCellRendererProps) {
  const title = String(props.value ?? '');

  if (title === '') {
    return <span className="text-muted-foreground text-sm italic">Untitled</span>;
  }

  return (
    <span className="text-foreground truncate text-sm font-medium" title={title}>
      {title}
    </span>
  );
}
