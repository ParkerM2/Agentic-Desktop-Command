import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const inputVariants = cva(
  'flex w-full rounded-md border bg-background px-3 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
      },
      size: {
        sm: 'h-8 text-xs',
        md: 'h-9 py-1',
        lg: 'h-10 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

// ─── Component (React 19 — no forwardRef) ───────────────

interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {}

function Input({ className, variant, size, type, ...props }: InputProps) {
  return (
    <input
      className={cn(inputVariants({ variant, size, className }))}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input, inputVariants };
export type { InputProps };
