import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const inlineAlertVariants = cva(
  'flex gap-3 rounded-md border p-3 text-sm',
  {
    variants: {
      variant: {
        error:
          'border-destructive/30 bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] text-foreground',
        warning:
          'border-warning/30 bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-foreground',
        info:
          'border-info/30 bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-foreground',
        success:
          'border-success/30 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const inlineAlertIconVariants = cva('flex-shrink-0 mt-0.5', {
  variants: {
    variant: {
      error: 'text-destructive',
      warning: 'text-warning',
      info: 'text-info',
      success: 'text-success',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const inlineAlertTitleVariants = cva('font-medium leading-tight', {
  variants: {
    variant: {
      error: 'text-destructive',
      warning: 'text-warning',
      info: 'text-info',
      success: 'text-success',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

// ─── Component (React 19 — no forwardRef) ───────────────

interface InlineAlertProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof inlineAlertVariants> {
  /** Optional heading text for the alert */
  title?: string;
  /** Body content of the alert */
  children?: React.ReactNode;
  /** Optional icon component rendered at the left */
  icon?: React.ComponentType<{ className?: string }>;
}

function InlineAlert({
  className,
  variant,
  title,
  children,
  icon,
  ...props
}: InlineAlertProps) {
  const IconEl = icon;
  const bodyTopMargin = title === undefined ? '' : 'mt-1';

  return (
    <div
      className={cn(inlineAlertVariants({ variant, className }))}
      data-slot="inline-alert"
      role="alert"
      {...props}
    >
      {IconEl === undefined ? null : (
        <IconEl className={cn(inlineAlertIconVariants({ variant }), 'h-4 w-4')} aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        {title === undefined ? null : (
          <p className={cn(inlineAlertTitleVariants({ variant }))}>{title}</p>
        )}
        {children === undefined ? null : (
          <div className={cn('text-muted-foreground', bodyTopMargin)}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export { InlineAlert, inlineAlertVariants };
export type { InlineAlertProps };
