/**
 * CollapsibleInstructions — Expandable section for setup instruction content.
 */

import type { ReactNode } from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

interface CollapsibleInstructionsProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleInstructions({
  title,
  isOpen,
  onToggle,
  children,
}: CollapsibleInstructionsProps) {
  return (
    <div className="border-border bg-muted/30 mt-3 rounded-md border">
      <button
        aria-expanded={isOpen}
        className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
        type="button"
        onClick={onToggle}
      >
        <span className="text-muted-foreground text-xs font-medium">{title}</span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen ? <div className="border-border border-t px-3 py-3">{children}</div> : null}
    </div>
  );
}
