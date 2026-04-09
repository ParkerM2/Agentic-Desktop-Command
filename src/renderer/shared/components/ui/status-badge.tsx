/**
 * StatusBadge — Glass-pill status indicator matching HealthIndicator style.
 *
 * Uses semi-transparent tinted background + colored border + colored text.
 * Optional pulsing dot for active/live states. The dot uses `bg-current`
 * so it inherits the text color and is always visible against the
 * translucent background.
 */

import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────────

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      tone: {
        muted: 'bg-muted/50 border-border text-muted-foreground',
        primary: 'bg-primary/10 border-primary/30 text-primary',
        success: 'bg-success/10 border-success/30 text-success',
        warning: 'bg-warning/10 border-warning/30 text-warning',
        info: 'bg-info/10 border-info/30 text-info',
        destructive: 'bg-destructive/10 border-destructive/30 text-destructive',
        purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      },
    },
    defaultVariants: {
      tone: 'muted',
    },
  },
);

// ─── Component ──────────────────────────────────────────────

interface StatusBadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof statusBadgeVariants> {
  /** Show a pulsing dot before the label */
  pulsing?: boolean;
}

function StatusBadge({
  className,
  tone,
  pulsing = false,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ tone, className }))}
      data-slot="status-badge"
      {...props}
    >
      {pulsing ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
