/**
 * WeekOverview — 7-day summary view
 */

import { useMemo } from 'react';

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

interface WeekDay {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
}

interface WeekOverviewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

function getWeekDays(centerDate: string): WeekDay[] {
  const center = new Date(`${centerDate}T00:00:00`);
  const dayOfWeek = center.getDay();
  const monday = new Date(center);
  monday.setDate(center.getDate() - ((dayOfWeek + 6) % 7));

  const today = new Date().toISOString().slice(0, 10);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const days: WeekDay[] = [];
  for (let index = 0; index < 7; index++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      dayLabel: dayNames[index],
      dayNumber: d.getDate(),
      isToday: dateStr === today,
    });
  }
  return days;
}

function formatWeekRange(days: WeekDay[]): string {
  if (days.length === 0) return '';
  const firstDay = days[0];
  const lastDay = days.at(-1) ?? firstDay;
  const first = new Date(`${firstDay.date}T00:00:00`);
  const last = new Date(`${lastDay.date}T00:00:00`);
  const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const startMonth = monthFmt.format(first);
  const endMonth = monthFmt.format(last);

  if (startMonth === endMonth) {
    return `${startMonth} ${String(first.getDate())} - ${String(last.getDate())}, ${String(first.getFullYear())}`;
  }
  return `${startMonth} ${String(first.getDate())} - ${endMonth} ${String(last.getDate())}, ${String(last.getFullYear())}`;
}

export function WeekOverview({ selectedDate, onSelectDate }: WeekOverviewProps) {
  const days = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekLabel = useMemo(() => formatWeekRange(days), [days]);

  function handlePrevWeek() {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() - 7);
    onSelectDate(current.toISOString().slice(0, 10));
  }

  function handleNextWeek() {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + 7);
    onSelectDate(current.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-sm font-medium">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous week"
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            onClick={handlePrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Next week"
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            onClick={handleNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <button
            key={day.date}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center transition-colors',
              day.date === selectedDate ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              day.isToday && day.date !== selectedDate && 'ring-primary ring-1',
            )}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="text-[10px] font-medium uppercase">{day.dayLabel}</span>
            <span className="text-sm font-semibold">{day.dayNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
