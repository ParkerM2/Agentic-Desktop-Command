/**
 * TodayView — Compact daily planner with time blocks
 */

import { Loader2 } from 'lucide-react';

import type { TimeBlock } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useDay } from '@features/planner';

type TimeBlockType = TimeBlock['type'];

const BLOCK_TYPE_COLORS: Record<TimeBlockType, string> = {
  focus: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  meeting: 'bg-green-500/15 text-green-400 border-green-500/30',
  break: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  other: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const BLOCK_TYPE_DOT_COLORS: Record<TimeBlockType, string> = {
  focus: 'bg-blue-400',
  meeting: 'bg-green-400',
  break: 'bg-purple-400',
  other: 'bg-orange-400',
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: plan, isLoading } = useDay(todayStr);
  const timeBlocks = plan?.timeBlocks ?? [];

  if (isLoading) {
    return (
      <div className="bg-card border-border rounded-lg border p-4">
        <h2 className="text-foreground mb-3 text-sm font-semibold">Today</h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">Today</h2>

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
        <p className="text-muted-foreground py-4 text-center text-xs">Nothing scheduled today</p>
      )}

      <div className="mt-3 flex gap-4 border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">Focus</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-muted-foreground">Meeting</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          <span className="text-muted-foreground">Break</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span className="text-muted-foreground">Other</span>
        </div>
      </div>
    </div>
  );
}
