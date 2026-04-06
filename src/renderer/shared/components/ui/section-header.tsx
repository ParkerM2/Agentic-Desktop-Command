import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const sectionHeaderVariants = cva('flex items-start justify-between gap-4', {
  variants: {
    size: {
      sm: 'mb-3',
      md: 'mb-4',
      lg: 'mb-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const sectionHeaderIconVariants = cva(
  'flex items-center justify-center rounded-md bg-muted text-muted-foreground flex-shrink-0',
  {
    variants: {
      size: {
        sm: 'h-7 w-7',
        md: 'h-9 w-9',
        lg: 'h-11 w-11',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const sectionHeaderTitleVariants = cva('font-semibold text-foreground leading-tight', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const sectionHeaderDescriptionVariants = cva('text-muted-foreground', {
  variants: {
    size: {
      sm: 'text-xs mt-0.5',
      md: 'text-sm mt-1',
      lg: 'text-sm mt-1',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// ─── Icon size helper ────────────────────────────────────

function getIconSize(size: 'sm' | 'md' | 'lg' | null | undefined): string {
  if (size === 'sm') return 'h-3.5 w-3.5';
  if (size === 'lg') return 'h-5 w-5';
  return 'h-4 w-4';
}

// ─── Component (React 19 — no forwardRef) ───────────────

interface SectionHeaderProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof sectionHeaderVariants> {
  /** Optional icon rendered before the title */
  icon?: React.ComponentType<{ className?: string }>;
  /** Section title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional action slot rendered at the far right (e.g. a Button) */
  children?: React.ReactNode;
}

function SectionHeader({
  className,
  size,
  icon,
  title,
  description,
  children,
  ...props
}: SectionHeaderProps) {
  const IconEl = icon;

  return (
    <div
      className={cn(sectionHeaderVariants({ size, className }))}
      data-slot="section-header"
      {...props}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {IconEl === undefined ? null : (
          <div className={cn(sectionHeaderIconVariants({ size }))}>
            <IconEl className={cn(getIconSize(size))} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className={cn(sectionHeaderTitleVariants({ size }))}>{title}</h2>
          {description === undefined ? null : (
            <p className={cn(sectionHeaderDescriptionVariants({ size }))}>{description}</p>
          )}
        </div>
      </div>
      {children === undefined ? null : (
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}

export { SectionHeader, sectionHeaderVariants };
export type { SectionHeaderProps };
