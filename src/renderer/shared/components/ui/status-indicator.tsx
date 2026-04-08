import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const statusIndicatorVariants = cva('inline-flex items-center gap-1.5 font-medium', {
  variants: {
    variant: {
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-destructive',
      info: 'text-info',
      neutral: 'text-muted-foreground',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

const statusIndicatorDotVariants = cva('rounded-full flex-shrink-0', {
  variants: {
    variant: {
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-destructive',
      info: 'bg-info',
      neutral: 'bg-muted-foreground',
    },
    size: {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

// ─── Component (React 19 — no forwardRef) ───────────────

interface StatusIndicatorProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof statusIndicatorVariants> {
  /** Optional label text rendered next to the dot */
  label?: string;
  /** Optional icon component rendered instead of the dot */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional badge element rendered after the label */
  badge?: React.ReactNode;
}

function StatusIndicator({
  className,
  variant,
  size,
  label,
  icon,
  badge,
  ...props
}: StatusIndicatorProps) {
  const IconEl = icon;

  return (
    <span
      className={cn(statusIndicatorVariants({ variant, size, className }))}
      data-slot="status-indicator"
      {...props}
    >
      {IconEl === undefined ? (
        <span className={cn(statusIndicatorDotVariants({ variant, size }))} />
      ) : (
        <IconEl className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      )}
      {label === undefined ? null : <span>{label}</span>}
      {badge === undefined ? null : badge}
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { StatusIndicator, statusIndicatorVariants };
export type { StatusIndicatorProps };
