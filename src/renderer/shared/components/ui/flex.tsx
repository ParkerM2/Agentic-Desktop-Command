import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────

const flexVariants = cva('flex flex-row flex-wrap', {
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
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      reverse: 'flex-wrap-reverse',
    },
  },
  defaultVariants: {
    gap: 'md',
    align: 'center',
    justify: 'start',
    wrap: 'wrap',
  },
});

// ─── Component ──────────────────────────────────────────

interface FlexProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof flexVariants> {}

function Flex({ className, gap, align, justify, wrap, ...props }: FlexProps) {
  return (
    <div
      className={cn(flexVariants({ gap, align, justify, wrap, className }))}
      data-slot="flex"
      {...props}
    />
  );
}

export { Flex, flexVariants };
export type { FlexProps };
