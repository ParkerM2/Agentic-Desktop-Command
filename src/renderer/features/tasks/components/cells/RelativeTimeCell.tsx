/**
 * RelativeTimeCell — AG-Grid cell renderer for relative timestamps.
 * Displays "2m ago", "1h ago", "3d ago" from ISO date strings.
 */

import { formatRelativeTime } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

export function RelativeTimeCell(props: CustomCellRendererProps) {
  const dateString = props.value as string | null | undefined;

  if (dateString === null || dateString === undefined) {
    return <span className="text-muted-foreground text-sm">&mdash;</span>;
  }

  const relative = formatRelativeTime(dateString);

  return (
    <span className="text-muted-foreground text-sm" title={dateString}>
      {relative}
    </span>
  );
}
