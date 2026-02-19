import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────

const containerVariants = cva('mx-auto w-full px-4 sm:px-6', {
  variants: {
    size: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      full: 'max-w-full',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

// ─── Component ──────────────────────────────────────────

interface ContainerProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof containerVariants> {}

function Container({ className, size, ...props }: ContainerProps) {
  return (
    <div
      className={cn(containerVariants({ size, className }))}
      data-slot="container"
      {...props}
    />
  );
}

export { Container, containerVariants };
export type { ContainerProps };
