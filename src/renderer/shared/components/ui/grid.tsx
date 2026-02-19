import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────

const gridVariants = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
      12: 'grid-cols-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    },
  },
  defaultVariants: {
    cols: 1,
    gap: 'md',
  },
});

// ─── Component ──────────────────────────────────────────

interface GridProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof gridVariants> {}

function Grid({ className, cols, gap, ...props }: GridProps) {
  return (
    <div
      className={cn(gridVariants({ cols, gap, className }))}
      data-slot="grid"
      {...props}
    />
  );
}

export { Grid, gridVariants };
export type { GridProps };
