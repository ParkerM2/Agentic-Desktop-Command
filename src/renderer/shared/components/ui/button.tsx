import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        'ghost-muted': 'text-muted-foreground hover:bg-accent hover:text-foreground',
        'ghost-destructive': 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-xs',
        md: 'h-9 px-4 py-2',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5',
        'icon-xs': 'h-6 w-6 rounded-sm p-1 [&_svg]:h-3.5 [&_svg]:w-3.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

// ─── Component (React 19 — no forwardRef) ───────────────

interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      type={asChild ? undefined : type}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
