import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@renderer/shared/lib/utils';

// ─── Provider ────────────────────────────────────────────

const TooltipProvider = TooltipPrimitive.Provider;

// ─── Root ────────────────────────────────────────────────

const Tooltip = TooltipPrimitive.Root;

// ─── Trigger ─────────────────────────────────────────────

const TooltipTrigger = TooltipPrimitive.Trigger;

// ─── Content (React 19 — no forwardRef) ──────────────────

function TooltipContent({
  children,
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
