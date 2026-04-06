/**
 * RelativeTimeCell — cell renderer for relative timestamps.
 * Displays "2m ago", "1h ago", "3d ago" from ISO date strings.
 */

import { formatRelativeTime } from '@renderer/shared/lib/utils';

export function RelativeTimeCell({ value }: { value: string | null | undefined }) {
  const dateString = value;

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
