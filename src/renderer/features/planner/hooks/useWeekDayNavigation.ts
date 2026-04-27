/**
 * useWeekDayNavigation — shared date navigation (prev/next week) for planner views.
 *
 * Extracts the identical prev-week / next-week date arithmetic
 * from WeekOverview and WeeklyReviewPage.
 */

interface UseWeekDayNavigationOptions {
  /** Current selected or start date (YYYY-MM-DD) */
  currentDate: string;
  /** Callback to update the date */
  onDateChange: (date: string) => void;
}

function shiftDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useWeekDayNavigation({ currentDate, onDateChange }: UseWeekDayNavigationOptions) {
  function handlePrevWeek(): void {
    onDateChange(shiftDays(currentDate, -7));
  }

  function handleNextWeek(): void {
    onDateChange(shiftDays(currentDate, 7));
  }

  function handlePrevDay(): void {
    onDateChange(shiftDays(currentDate, -1));
  }

  function handleNextDay(): void {
    onDateChange(shiftDays(currentDate, 1));
  }

  return {
    handlePrevWeek,
    handleNextWeek,
    handlePrevDay,
    handleNextDay,
  };
}
