/**
 * DayCompact — Compact daily view card for the weekly overview grid
 */

import { Clock, Target } from 'lucide-react';

import type { DailyPlan } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { formatDayCompact, getBlockTypeColor, isToday } from './weekly-review-utils';

export function DayCompact({ plan }: { plan: DailyPlan }) {
  const { dayName, dayNumber } = formatDayCompact(plan.date);
  const today = isToday(plan.date);
  const hasData = plan.goals.length > 0 || plan.timeBlocks.length > 0;

  return (
    <div
      className={cn('bg-card border-border rounded-lg border p-3', today && 'ring-primary ring-2')}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{dayName}</span>
        <span className={cn('text-sm font-medium', today ? 'text-primary' : 'text-foreground')}>
          {dayNumber}
        </span>
      </div>

      {hasData ? (
        <div className="space-y-2">
          {plan.goals.length > 0 ? (
            <div className="flex items-center gap-1">
              <Target className="text-primary h-3 w-3" />
              <span className="text-muted-foreground text-xs">
                {plan.goals.length} goal{plan.goals.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}

          {plan.timeBlocks.length > 0 ? (
            <div className="flex items-center gap-1">
              <Clock className="text-info h-3 w-3" />
              <span className="text-muted-foreground text-xs">
                {plan.timeBlocks.length} block{plan.timeBlocks.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}

          {plan.timeBlocks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {plan.timeBlocks.slice(0, 3).map((block) => (
                <span
                  key={block.id}
                  className={cn('rounded px-1.5 py-0.5 text-[10px]', getBlockTypeColor(block.type))}
                >
                  {block.label.slice(0, 12)}
                  {block.label.length > 12 ? '...' : ''}
                </span>
              ))}
              {plan.timeBlocks.length > 3 ? (
                <span className="text-muted-foreground text-[10px]">
                  +{plan.timeBlocks.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs italic">No data</p>
      )}
    </div>
  );
}
