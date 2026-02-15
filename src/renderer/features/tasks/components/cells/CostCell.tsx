/**
 * CostCell — AG-Grid cell renderer for formatted dollar amounts.
 * Shows dash if value is 0 or undefined.
 */

import type { CustomCellRendererProps } from 'ag-grid-react';

export function CostCell(props: CustomCellRendererProps) {
  const rawValue = props.value as number | null | undefined;
  const cost = typeof rawValue === 'number' ? rawValue : 0;

  if (cost === 0) {
    return <span className="text-muted-foreground text-sm">&mdash;</span>;
  }

  return <span className="text-foreground text-sm">${cost.toFixed(2)}</span>;
}
