import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@renderer/shared/lib/utils';

// ─── Component ──────────────────────────────────────────

type SeparatorProps = React.ComponentProps<typeof SeparatorPrimitive.Root>;

function Separator({
  className,
  decorative = true,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
export type { SeparatorProps };
