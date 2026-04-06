import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const metadataListVariants = cva('', {
  variants: {
    variant: {
      inline: 'flex flex-wrap gap-x-4 gap-y-1',
      stacked: 'flex flex-col gap-2',
    },
  },
  defaultVariants: {
    variant: 'stacked',
  },
});

const metadataItemVariants = cva('', {
  variants: {
    variant: {
      inline: 'flex items-center gap-1.5',
      stacked: 'flex flex-col gap-0.5',
    },
  },
  defaultVariants: {
    variant: 'stacked',
  },
});

const metadataTermVariants = cva('text-muted-foreground font-medium', {
  variants: {
    variant: {
      inline: 'text-xs',
      stacked: 'text-xs',
    },
  },
  defaultVariants: {
    variant: 'stacked',
  },
});

const metadataValueVariants = cva('text-foreground', {
  variants: {
    variant: {
      inline: 'text-xs',
      stacked: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'stacked',
  },
});

// ─── Types ───────────────────────────────────────────────

type MetadataVariant = 'inline' | 'stacked';

// ─── Components (React 19 — no forwardRef) ───────────────

interface MetadataListProps
  extends React.ComponentProps<'dl'>,
    VariantProps<typeof metadataListVariants> {}

function MetadataList({ className, variant, children, ...props }: MetadataListProps) {
  return (
    <dl
      className={cn(metadataListVariants({ variant, className }))}
      data-slot="metadata-list"
      data-variant={variant ?? 'stacked'}
      {...props}
    >
      {children}
    </dl>
  );
}

interface MetadataItemProps extends React.ComponentProps<'div'> {
  /** Key / label for the metadata entry */
  label: string;
  /** Value for the metadata entry */
  value: React.ReactNode;
  /** Inherit variant from parent MetadataList */
  variant?: MetadataVariant;
}

function MetadataItem({ className, label, value, variant = 'stacked', ...props }: MetadataItemProps) {
  return (
    <div
      className={cn(metadataItemVariants({ variant, className }))}
      data-slot="metadata-item"
      {...props}
    >
      <dt className={cn(metadataTermVariants({ variant }))}>{label}</dt>
      <dd className={cn(metadataValueVariants({ variant }))}>{value}</dd>
    </div>
  );
}

export { MetadataList, MetadataItem, metadataListVariants };
export type { MetadataListProps, MetadataItemProps, MetadataVariant };
