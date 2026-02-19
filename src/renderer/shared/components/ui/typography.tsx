import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Heading ────────────────────────────────────────────

const headingVariants = cva('text-foreground font-semibold tracking-tight', {
  variants: {
    as: {
      h1: 'text-2xl',
      h2: 'text-xl',
      h3: 'text-lg',
      h4: 'text-base',
    },
  },
  defaultVariants: {
    as: 'h2',
  },
});

interface HeadingProps
  extends React.ComponentProps<'h1'>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

function Heading({ as = 'h2', className, ...props }: HeadingProps) {
  const Comp = as;
  return (
    <Comp
      className={cn(headingVariants({ as, className }))}
      data-slot="heading"
      {...props}
    />
  );
}

// ─── Text ───────────────────────────────────────────────

const textVariants = cva('', {
  variants: {
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      error: 'text-destructive',
      success: 'text-success',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface TextProps
  extends React.ComponentProps<'p'>,
    VariantProps<typeof textVariants> {}

function Text({ className, variant, size, ...props }: TextProps) {
  return (
    <p
      className={cn(textVariants({ variant, size, className }))}
      data-slot="text"
      {...props}
    />
  );
}

// ─── Code ───────────────────────────────────────────────

type CodeProps = React.ComponentProps<'code'>;

function Code({ className, ...props }: CodeProps) {
  return (
    <code
      data-slot="code"
      className={cn(
        'bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs',
        className,
      )}
      {...props}
    />
  );
}

export { Heading, headingVariants, Text, textVariants, Code };
export type { HeadingProps, TextProps, CodeProps };
