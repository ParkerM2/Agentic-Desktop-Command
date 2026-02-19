import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────

const stackVariants = cva('flex flex-col', {
  variants: {
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: {
    gap: 'md',
    align: 'stretch',
    justify: 'start',
  },
});

// ─── Component ──────────────────────────────────────────

interface StackProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof stackVariants> {}

function Stack({ className, gap, align, justify, ...props }: StackProps) {
  return (
    <div
      className={cn(stackVariants({ gap, align, justify, className }))}
      data-slot="stack"
      {...props}
    />
  );
}

export { Stack, stackVariants };
export type { StackProps };
