/**
 * TitleCell — cell renderer for bold truncated task title.
 * Full title shown on hover via title attribute.
 */

export function TitleCell({ value }: { value: string }) {
  if (value.length === 0) {
    return <span className="text-muted-foreground text-sm italic">Untitled</span>;
  }

  return (
    <span className="text-foreground truncate text-sm font-medium" title={value}>
      {value}
    </span>
  );
}
