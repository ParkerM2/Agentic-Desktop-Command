import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────

const progressVariants = cva(
  'bg-secondary relative w-full overflow-hidden rounded-full',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

// ─── Progress ───────────────────────────────────────────

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number;
}

function Progress({ className, size, value = 0, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      className={cn(progressVariants({ size, className }))}
      data-slot="progress"
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${String(100 - value)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress, progressVariants };
export type { ProgressProps };
