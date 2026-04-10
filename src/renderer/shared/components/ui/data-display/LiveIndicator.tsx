/**
 * LiveIndicator — Animated pulse indicator for active/running items.
 *
 * Shows an animated pulse dot when active and a static dot when inactive.
 * Optionally displays a text label alongside the dot.
 */

import { cn } from '@renderer/shared/lib/utils';

// ─── Types ──────────────────────────────────────────────────

export interface LiveIndicatorProps {
  isActive: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─── Size map ───────────────────────────────────────────────

const sizeClasses: Record<NonNullable<LiveIndicatorProps['size']>, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

const labelSizeClasses: Record<NonNullable<LiveIndicatorProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

// ─── Component ──────────────────────────────────────────────

export function LiveIndicator({
  isActive,
  label,
  size = 'md',
  className,
}: LiveIndicatorProps) {
  const hasLabel = label !== undefined && label.length > 0;

  return (
    <span
      aria-label={isActive ? 'Active' : 'Inactive'}
      className={cn('inline-flex items-center gap-1.5', className)}
      data-testid="live-indicator"
      role="status"
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block rounded-full shrink-0',
          isActive ? 'bg-success animate-pulse' : 'bg-muted-foreground',
          sizeClasses[size],
        )}
      />
      {hasLabel ? (
        <span
          className={cn(
            'text-muted-foreground',
            labelSizeClasses[size],
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
