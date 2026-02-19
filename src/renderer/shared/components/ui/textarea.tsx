import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const textareaVariants = cva(
  'flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
      },
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        both: 'resize',
      },
    },
    defaultVariants: {
      variant: 'default',
      resize: 'vertical',
    },
  },
);

// ─── Component (React 19 — no forwardRef) ───────────────

interface TextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'resize'>,
    VariantProps<typeof textareaVariants> {}

function Textarea({ className, variant, resize, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(textareaVariants({ variant, resize, className }))}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
export type { TextareaProps };
