/**
 * ContentAreaContainer — Compositional wrapper for TopBar + content area.
 *
 * Reads `contentLayout` from the layout store and applies the selected
 * content area style. Styles control padding, borders, and rounding of
 * the main content region to visually mesh with the selected sidebar.
 *
 *   - flush:    no padding, edge-to-edge (current default)
 *   - padded:   subtle inner padding
 *   - bordered: rounded border with inner spacing
 *   - inset:    recessed area with rounded corners and background tint
 */

import type { ContentLayoutId } from '@shared/types/layout';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

// ── Style maps ──────────────────────────────────────────────

/** Applied to the root container — insets both toolbar and content equally */
const CONTAINER_STYLE: Record<ContentLayoutId, string> = {
  flush: '',
  padded: 'p-[var(--layout-gap)] gap-[var(--layout-gap)]',
  bordered: 'p-[var(--layout-gap)] gap-[var(--layout-gap)]',
  inset: 'p-[var(--layout-gap-lg)] gap-[var(--layout-gap-lg)]',
};

/** Applied to the inner content wrapper — decoration only */
const INNER_STYLE: Record<ContentLayoutId, string> = {
  flush: '',
  padded: '',
  bordered: 'border-border rounded-lg border',
  inset: 'bg-muted/30 border-border rounded-xl border',
};

// ── Sub-components ──────────────────────────────────────────

interface ContentAreaContainerProps {
  children: React.ReactNode;
  className?: string;
}

interface SlotProps {
  children: React.ReactNode;
  className?: string;
}

function ToolBarSlot({ children, className }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

function ContentSlot({ children, className }: SlotProps) {
  const contentLayout = useLayoutStore((s) => s.contentLayout);
  const innerClass = INNER_STYLE[contentLayout];

  if (!innerClass) {
    return (
      <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>
      <div className={cn('h-full overflow-hidden', innerClass)}>
        {children}
      </div>
    </div>
  );
}

// ── Main Container ──────────────────────────────────────────

function ContentAreaContainerRoot({ children, className }: ContentAreaContainerProps) {
  const contentLayout = useLayoutStore((s) => s.contentLayout);

  return (
    <div
      className={cn('flex h-full flex-col', CONTAINER_STYLE[contentLayout], className)}
      data-content-layout={contentLayout}
    >
      {children}
    </div>
  );
}

// ── Compound export ─────────────────────────────────────────

export const ContentAreaContainer = Object.assign(ContentAreaContainerRoot, {
  ToolBar: ToolBarSlot,
  Content: ContentSlot,
});
