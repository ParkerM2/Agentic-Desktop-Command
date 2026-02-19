import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        required:
          'text-foreground after:ml-0.5 after:text-destructive after:content-["*"]',
        error: 'text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ─── Component (React 19 — no forwardRef) ───────────────

interface LabelProps
  extends React.ComponentProps<'label'>,
    VariantProps<typeof labelVariants> {}

function Label({ className, variant, ...props }: LabelProps) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- primitive: consumers provide htmlFor
    <label
      className={cn(labelVariants({ variant, className }))}
      data-slot="label"
      {...props}
    />
  );
}

export { Label, labelVariants };
export type { LabelProps };
