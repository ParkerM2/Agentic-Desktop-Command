/**
 * CostCell — cell renderer for formatted dollar amounts.
 * Shows dash if value is 0 or undefined.
 */

export function CostCell({ value }: { value: number | null | undefined }) {
  const cost = typeof value === 'number' ? value : 0;

  if (cost === 0) {
    return <span className="text-muted-foreground text-sm">&mdash;</span>;
  }

  return <span className="text-foreground text-sm">${cost.toFixed(2)}</span>;
}
