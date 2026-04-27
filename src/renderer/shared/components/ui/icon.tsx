/**
 * Icon — Variant-driven icon wrapper.
 *
 * Accepts any Lucide-compatible icon component and applies CVA
 * variant styling. Reusable across all features.
 */

import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────────

const iconVariants = cva('shrink-0', {
  variants: {
    variant: {
      default: 'text-foreground',
      muted: 'text-text-dim',
      success: 'text-green-500',
      passed: 'text-green-500',
      error: 'text-destructive',
      failed: 'text-destructive',
      warning: 'text-yellow-500',
      info: 'text-accent',
      active: 'animate-spin text-accent',
      running: 'animate-spin text-accent',
      pending: 'text-text-dim',
    },
    size: {
      xs: 'h-3 w-3',
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'sm',
  },
});

// ─── Component ──────────────────────────────────────────────

interface IconProps extends VariantProps<typeof iconVariants> {
  component: React.ComponentType<{ className?: string }>;
  className?: string;
}

function Icon({ component, variant, size, className }: IconProps) {
  const Rendered = component;
  return <Rendered className={cn(iconVariants({ variant, size }), className)} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Icon, iconVariants };
export type { IconProps };
