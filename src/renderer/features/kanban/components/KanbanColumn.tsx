/**
 * KanbanColumn — Droppable column in the kanban board
 */

import type { ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';

import { cn } from '@renderer/shared/lib/utils';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ id, label, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-border bg-card/50 flex w-72 shrink-0 flex-col rounded-lg border',
        'border-t-2 transition-colors',
        color,
        isOver && 'bg-accent/30 border-primary/40',
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="min-h-[100px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">{children}</div>
    </div>
  );
}
