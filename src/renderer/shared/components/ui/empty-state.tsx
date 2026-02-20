import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const emptyStateVariants = cva('flex flex-col items-center justify-center text-center', {
  variants: {
    size: {
      sm: 'gap-2 py-8',
      md: 'gap-3 py-12',
      lg: 'gap-4 py-16',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const emptyStateIconVariants = cva(
  'text-muted-foreground flex items-center justify-center rounded-full bg-muted',
  {
    variants: {
      size: {
        sm: 'h-10 w-10',
        md: 'h-14 w-14',
        lg: 'h-18 w-18',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const emptyStateIconInnerVariants = cva('', {
  variants: {
    size: {
      sm: 'h-5 w-5',
      md: 'h-7 w-7',
      lg: 'h-9 w-9',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const emptyStateTitleVariants = cva('text-foreground font-medium', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-lg',
      lg: 'text-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const emptyStateDescriptionVariants = cva('text-muted-foreground max-w-sm', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// ─── Component (React 19 — no forwardRef) ───────────────

interface EmptyStateProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof emptyStateVariants> {
  /** Icon component to render inside the circular background */
  icon?: React.ComponentType<{ className?: string }>;
  /** Primary heading text */
  title: string;
  /** Optional secondary description text */
  description?: string;
  /** Optional action slot (e.g. a Button) rendered below description */
  action?: React.ReactNode;
}

function EmptyState({
  className,
  size,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  const IconEl = icon;

  return (
    <div
      className={cn(emptyStateVariants({ size, className }))}
      data-slot="empty-state"
      {...props}
    >
      {IconEl === undefined ? null : (
        <div className={cn(emptyStateIconVariants({ size }))}>
          <IconEl className={cn(emptyStateIconInnerVariants({ size }))} />
        </div>
      )}
      <h3 className={cn(emptyStateTitleVariants({ size }))}>{title}</h3>
      {description === undefined ? null : (
        <p className={cn(emptyStateDescriptionVariants({ size }))}>{description}</p>
      )}
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState, emptyStateVariants };
export type { EmptyStateProps };
