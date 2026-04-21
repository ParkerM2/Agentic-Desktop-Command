/**
 * DetailPanel — Sliding right-side panel for item details
 *
 * Fixed position, z-50. Slide animation via CSS transform.
 * Backdrop closes panel on click.
 */

import type { ReactNode } from 'react';

import { X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Heading } from '@ui';

// ─── Types ───────────────────────────────────────────────

export interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export function DetailPanel({
  isOpen,
  onClose,
  title,
  children,
  width = 'w-[420px]',
  className,
}: DetailPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      ) : null}

      {/* Panel */}
      <div
        aria-label={title}
        aria-modal="true"
        data-testid="detail-panel"
        role="dialog"
        className={cn(
          'bg-card border-border fixed top-0 right-0 z-50 flex h-full flex-col border-l shadow-xl',
          'transition-transform duration-300 ease-in-out',
          width,
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {/* Header */}
        <div className="border-border flex shrink-0 items-center justify-between border-b px-[var(--layout-pad-md)] py-[var(--layout-gap-lg)]">
          <Heading as="h3" className="truncate">{title}</Heading>
          <Button
            aria-label="Close panel"
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-[var(--layout-pad-md)] py-[var(--layout-pad-md)]">
          {children}
        </div>
      </div>
    </>
  );
}
