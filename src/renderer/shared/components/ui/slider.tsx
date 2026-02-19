import * as SliderPrimitive from '@radix-ui/react-slider';
import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants ───────────────────────────────────────────

const sliderTrackVariants = cva(
  'bg-secondary relative w-full grow overflow-hidden rounded-full',
  {
    variants: {
      size: {
        sm: 'h-1',
        md: 'h-1.5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const sliderThumbVariants = cva(
  'border-primary bg-background focus-visible:ring-ring block rounded-full border shadow transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

// ─── Slider ─────────────────────────────────────────────

interface SliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderTrackVariants> {}

function Slider({ className, size, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(sliderTrackVariants({ size }))}>
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn(sliderThumbVariants({ size }))} />
    </SliderPrimitive.Root>
  );
}

export { Slider, sliderTrackVariants, sliderThumbVariants };
export type { SliderProps };
