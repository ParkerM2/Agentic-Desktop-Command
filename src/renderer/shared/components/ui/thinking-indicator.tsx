/**
 * ThinkingIndicator — Reusable Claude "thinking" animation
 *
 * Shows an animated indicator when a Claude session is processing.
 * Supports multiple sizes and optional session label.
 *
 * Usage:
 *   <ThinkingIndicator />
 *   <ThinkingIndicator label="Assistant" size="sm" />
 *   <ThinkingIndicator label="Team Lead 1" size="md" />
 *   <ThinkingIndicator label="Generating..." size="sm" variant="inline" />
 */

import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ────────────────────────────────────────────

const thinkingVariants = cva('inline-flex items-center', {
  variants: {
    size: {
      xs: 'gap-1 text-[10px]',
      sm: 'gap-1.5 text-xs',
      md: 'gap-2 text-sm',
    },
    variant: {
      /** Default: standalone row with label */
      default: 'text-muted-foreground',
      /** Inline: subtle, for embedding inside buttons or cells */
      inline: 'text-muted-foreground/70',
    },
  },
  defaultVariants: {
    size: 'sm',
    variant: 'default',
  },
});

const dotVariants = cva('rounded-full bg-primary', {
  variants: {
    size: {
      xs: 'h-1 w-1',
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

// ─── Animated Dots ───────────────────────────────────────

function ThinkingDots({ size }: { size?: 'xs' | 'sm' | 'md' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="status">
      <span
        className={cn(dotVariants({ size }), 'animate-bounce')}
        style={{ animationDelay: '0ms', animationDuration: '600ms' }}
      />
      <span
        className={cn(dotVariants({ size }), 'animate-bounce')}
        style={{ animationDelay: '150ms', animationDuration: '600ms' }}
      />
      <span
        className={cn(dotVariants({ size }), 'animate-bounce')}
        style={{ animationDelay: '300ms', animationDuration: '600ms' }}
      />
    </span>
  );
}

// ─── Component ───────────────────────────────────────────

interface ThinkingIndicatorProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof thinkingVariants> {
  /** Session or feature label (e.g. "Assistant", "Team Lead 1", "Generating...") */
  label?: string;
}

function ThinkingIndicator({
  className,
  size,
  variant,
  label,
  ...props
}: ThinkingIndicatorProps) {
  return (
    <span
      aria-label={label ? `${label} is thinking` : 'Thinking'}
      className={cn(thinkingVariants({ size, variant, className }))}
      data-slot="thinking-indicator"
      role="status"
      {...props}
    >
      <ThinkingDots size={size ?? 'sm'} />
      {label === undefined ? null : <span>{label}</span>}
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { ThinkingIndicator, thinkingVariants };
export type { ThinkingIndicatorProps };
