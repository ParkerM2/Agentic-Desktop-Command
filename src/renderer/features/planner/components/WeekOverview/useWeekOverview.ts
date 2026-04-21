/**
 * useWeekOverview — logic for WeekOverview
 */

import { useMemo } from 'react';

import { useToday } from '@renderer/shared/hooks/useToday';

import { useWeekDayNavigation } from '../../hooks/useWeekDayNavigation';

interface WeekDay {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
}

function getWeekDays(centerDate: string, today: string): WeekDay[] {
  const center = new Date(`${centerDate}T00:00:00`);
  const dayOfWeek = center.getDay();
  const monday = new Date(center);
  monday.setDate(center.getDate() - ((dayOfWeek + 6) % 7));

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

export function useWeekOverview(selectedDate: string, onSelectDate: (date: string) => void) {
  const today = useToday();
  const days = useMemo(() => getWeekDays(selectedDate, today), [selectedDate, today]);
  const weekLabel = useMemo(() => formatWeekRange(days), [days]);

  const { handlePrevWeek, handleNextWeek } = useWeekDayNavigation({
    currentDate: selectedDate,
    onDateChange: onSelectDate,
  });

  return {
    days,
    weekLabel,
    handlePrevWeek,
    handleNextWeek,
  };
}
