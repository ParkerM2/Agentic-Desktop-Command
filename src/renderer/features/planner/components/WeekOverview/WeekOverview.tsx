/**
 * WeekOverview — 7-day summary view
 */

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

import { useWeekOverview } from './useWeekOverview';

interface WeekOverviewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function WeekOverview({ selectedDate, onSelectDate }: WeekOverviewProps) {
  const { days, weekLabel, handlePrevWeek, handleNextWeek } = useWeekOverview(
    selectedDate,
    onSelectDate,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-sm font-medium">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous week"
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            size="icon"
            variant="ghost"
            onClick={handlePrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Next week"
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            size="icon"
            variant="ghost"
            onClick={handleNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <Button
            key={day.date}
            variant="ghost"
            className={cn(
              'flex h-auto flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center transition-colors',
              day.date === selectedDate ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              day.isToday && day.date !== selectedDate && 'ring-primary ring-1',
            )}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="text-[10px] font-medium uppercase">{day.dayLabel}</span>
            <span className="text-sm font-semibold">{day.dayNumber}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
