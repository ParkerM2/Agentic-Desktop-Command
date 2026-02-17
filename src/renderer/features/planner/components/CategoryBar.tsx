/**
 * CategoryBar — Horizontal bar showing hours for a time block category
 */

import { cn } from '@renderer/shared/lib/utils';

interface CategoryBarProps {
  label: string;
  hours: number;
  totalHours: number;
  colorClass: string;
}

export function CategoryBar({ label, hours, totalHours, colorClass }: CategoryBarProps) {
  const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground capitalize">{label}</span>
        <span className="text-muted-foreground">{hours}h</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
