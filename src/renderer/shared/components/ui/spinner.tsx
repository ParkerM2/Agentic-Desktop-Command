import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

// ─── Component (React 19 — no forwardRef) ───────────────

interface SpinnerProps
  extends Omit<React.ComponentProps<typeof Loader2>, 'size'>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn(spinnerVariants({ size, className }))}
      data-slot="spinner"
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
export type { SpinnerProps };
