/**
 * Utility functions for the Weekly Review feature
 */

import type { TimeBlock } from '@shared/types';

/**
 * Get Monday of the week containing the given date
 */
export function getWeekMonday(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Format date range for display
 */
export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format day for compact display
 */
export function formatDayCompact(dateStr: string): { dayName: string; dayNumber: string } {
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: String(date.getDate()),
  };
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

/**
 * Get time block type color
 */
export function getBlockTypeColor(type: TimeBlock['type']): string {
  switch (type) {
    case 'focus':
      return 'bg-primary/20 text-primary';
    case 'meeting':
      return 'bg-info/20 text-info';
    case 'break':
      return 'bg-success/20 text-success';
    case 'other':
      return 'bg-muted text-muted-foreground';
  }
}
