/**
 * PriorityCell — AG-Grid cell renderer for task priority icon + label.
 */

import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface PriorityConfig {
  label: string;
  icon: typeof ArrowDown;
  className: string;
}

const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  low: {
    label: 'Low',
    icon: ArrowDown,
    className: 'text-muted-foreground',
  },
  medium: {
    label: 'Medium',
    icon: Minus,
    className: 'text-foreground',
  },
  high: {
    label: 'High',
    icon: ArrowUp,
    className: 'text-warning',
  },
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    className: 'text-destructive',
  },
};

export function PriorityCell(props: CustomCellRendererProps) {
  const priority = (props.value as Priority | undefined) ?? 'medium';
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 py-1', config.className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-sm">{config.label}</span>
    </div>
  );
}
