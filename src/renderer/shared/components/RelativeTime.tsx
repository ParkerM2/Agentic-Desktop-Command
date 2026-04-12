/**
 * RelativeTime — shared component displaying a relative timestamp (e.g. "2h ago")
 * with a tooltip showing the full absolute ISO date/time on hover.
 */

import { formatRelativeTime } from '@renderer/shared/lib/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from '@ui';

interface RelativeTimeProps {
  value: string | null | undefined;
  className?: string;
}

export function RelativeTime({ value, className }: RelativeTimeProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-xs">&mdash;</span>;
  }

  const relative = formatRelativeTime(value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className ?? 'text-muted-foreground text-xs'}>{relative}</span>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}
