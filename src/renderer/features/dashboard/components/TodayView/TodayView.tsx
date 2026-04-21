/**
 * TodayView — Compact daily planner with time blocks
 */

import { Loader2 } from 'lucide-react';

import type { TimeBlock } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Card, CardContent, EmptyState } from '@ui';

import { useTodayView } from './useTodayView';

type TimeBlockType = TimeBlock['type'];

const BLOCK_TYPE_COLORS: Record<TimeBlockType, string> = {
  focus: 'bg-info/10 text-info border-info/30',
  meeting: 'bg-success/10 text-success border-success/30',
  break: 'bg-warning/10 text-warning border-warning/30',
  other: 'bg-muted text-muted-foreground border-border',
};

const BLOCK_TYPE_DOT_COLORS: Record<TimeBlockType, string> = {
  focus: 'bg-info',
  meeting: 'bg-success',
  break: 'bg-warning',
  other: 'bg-muted-foreground',
};

/** Format "09:00" or "13:30" to "9:00 AM" / "1:30 PM" */
function formatTime(time: string): string {
  const parts = time.split(':');
  const hours = Number(parts[0]);
  const minutes = parts[1];
  const suffix = hours >= 12 ? 'PM' : 'AM';

  let displayHours = hours;
  if (hours === 0) {
    displayHours = 12;
  } else if (hours > 12) {
    displayHours = hours - 12;
  }

  return `${String(displayHours)}:${minutes} ${suffix}`;
}

export function TodayView() {
  const { timeBlocks, isLoading } = useTodayView();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-foreground mb-3 text-sm font-semibold">Today</p>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-foreground mb-3 text-sm font-semibold">Today</p>

        {timeBlocks.length > 0 ? (
          <div className="space-y-2">
            {timeBlocks.map((block) => (
              <div
                key={block.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-3 py-2 text-xs',
                  BLOCK_TYPE_COLORS[block.type],
                )}
              >
                <span className="w-16 shrink-0 font-mono opacity-80">
                  {formatTime(block.startTime)}
                </span>
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    BLOCK_TYPE_DOT_COLORS[block.type],
                  )}
                />
                <span className="truncate font-medium">{block.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="py-4"
            description="Nothing scheduled today"
            size="sm"
            title="No blocks"
          />
        )}

        <div className="mt-3 flex gap-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bg-info h-2 w-2 rounded-full" />
            <span className="text-muted-foreground">Focus</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bg-success h-2 w-2 rounded-full" />
            <span className="text-muted-foreground">Meeting</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bg-warning h-2 w-2 rounded-full" />
            <span className="text-muted-foreground">Break</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bg-muted-foreground h-2 w-2 rounded-full" />
            <span className="text-muted-foreground">Other</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
