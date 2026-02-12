/**
 * TodayView — Compact daily planner with time blocks
 */

import { cn } from '@renderer/shared/lib/utils';

type TimeBlockCategory = 'work' | 'side-project' | 'personal';

interface TimeBlock {
  id: string;
  time: string;
  label: string;
  category: TimeBlockCategory;
}

const CATEGORY_COLORS: Record<TimeBlockCategory, string> = {
  work: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'side-project': 'bg-green-500/15 text-green-400 border-green-500/30',
  personal: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const CATEGORY_DOT_COLORS: Record<TimeBlockCategory, string> = {
  work: 'bg-blue-400',
  'side-project': 'bg-green-400',
  personal: 'bg-purple-400',
};

/** Placeholder schedule data */
const MOCK_TIME_BLOCKS: TimeBlock[] = [
  { id: 'tb-1', time: '9:00 AM', label: 'Daily standup', category: 'work' },
  { id: 'tb-2', time: '10:00 AM', label: 'Feature development', category: 'work' },
  { id: 'tb-3', time: '1:00 PM', label: 'Claude-UI dashboard', category: 'side-project' },
  { id: 'tb-4', time: '3:00 PM', label: 'Code review', category: 'work' },
  { id: 'tb-5', time: '5:30 PM', label: 'Gym', category: 'personal' },
];

export function TodayView() {
  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">Today</h2>

      {MOCK_TIME_BLOCKS.length > 0 ? (
        <div className="space-y-2">
          {MOCK_TIME_BLOCKS.map((block) => (
            <div
              key={block.id}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-xs',
                CATEGORY_COLORS[block.category],
              )}
            >
              <span className="w-16 shrink-0 font-mono opacity-80">{block.time}</span>
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  CATEGORY_DOT_COLORS[block.category],
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
          <span className="text-muted-foreground">Work</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-muted-foreground">Side project</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          <span className="text-muted-foreground">Personal</span>
        </div>
      </div>
    </div>
  );
}
