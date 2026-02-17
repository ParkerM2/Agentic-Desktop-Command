/**
 * WeeklyReviewPage — Weekly planner data aggregation view
 */

import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';

import { useWeeklyReview, useGenerateWeeklyReview } from '../api/useWeeklyReview';

import { CategoryBar } from './CategoryBar';
import { DayCompact } from './DayCompact';
import { StatCard } from './StatCard';
import { formatWeekRange, getWeekMonday } from './weekly-review-utils';
import { WeeklyReflectionSection } from './WeeklyReflectionSection';

export function WeeklyReviewPage() {
  const [weekStart, setWeekStart] = useState(() =>
    getWeekMonday(new Date().toISOString().slice(0, 10)),
  );

  const { data: review, isLoading } = useWeeklyReview(weekStart);
  const generateReview = useGenerateWeeklyReview();

  function handlePrevWeek() {
    const date = new Date(`${weekStart}T00:00:00`);
    date.setDate(date.getDate() - 7);
    setWeekStart(date.toISOString().slice(0, 10));
  }

  function handleNextWeek() {
    const date = new Date(`${weekStart}T00:00:00`);
    date.setDate(date.getDate() + 7);
    setWeekStart(date.toISOString().slice(0, 10));
  }

  function handleGoThisWeek() {
    setWeekStart(getWeekMonday(new Date().toISOString().slice(0, 10)));
  }

  function handleRefresh() {
    generateReview.mutate(weekStart);
  }

  const isThisWeek = weekStart === getWeekMonday(new Date().toISOString().slice(0, 10));

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="border-border flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-primary h-5 w-5" />
          <h1 className="text-foreground text-lg font-semibold">Weekly Review</h1>
        </div>

        <div className="flex items-center gap-2">
          {isThisWeek ? null : (
            <button
              className="text-primary hover:text-primary/80 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              onClick={handleGoThisWeek}
            >
              This Week
            </button>
          )}

          <div className="border-border flex items-center rounded-md border">
            <button
              aria-label="Previous week"
              className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
              onClick={handlePrevWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-foreground min-w-[160px] px-2 text-center text-sm font-medium">
              {review ? formatWeekRange(review.weekStartDate, review.weekEndDate) : ''}
            </span>
            <button
              aria-label="Next week"
              className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
              onClick={handleNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            aria-label="Refresh summary"
            disabled={generateReview.isPending}
            className={cn(
              'text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors',
              generateReview.isPending && 'animate-spin',
            )}
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <Link
            className="text-muted-foreground hover:text-primary ml-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            to={ROUTES.PLANNER}
          >
            <Calendar className="h-3.5 w-3.5" />
            Daily Planner
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Goals Set"
            value={review?.summary.totalGoalsSet ?? 0}
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Tasks Completed"
            value={review?.summary.totalGoalsCompleted ?? 0}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Time Blocks"
            value={review?.summary.totalTimeBlocks ?? 0}
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Hours Planned"
            subtext="hrs"
            value={review?.summary.totalHoursPlanned ?? 0}
          />
        </div>

        {/* Category breakdown */}
        <div className="bg-card border-border rounded-lg border p-4">
          <h2 className="text-foreground mb-4 text-sm font-semibold">
            Time Distribution by Category
          </h2>
          <div className="space-y-3">
            <CategoryBar
              colorClass="bg-primary"
              hours={review?.summary.categoryBreakdown.focus ?? 0}
              label="Focus"
              totalHours={review?.summary.totalHoursPlanned ?? 0}
            />
            <CategoryBar
              colorClass="bg-info"
              hours={review?.summary.categoryBreakdown.meeting ?? 0}
              label="Meetings"
              totalHours={review?.summary.totalHoursPlanned ?? 0}
            />
            <CategoryBar
              colorClass="bg-success"
              hours={review?.summary.categoryBreakdown.break ?? 0}
              label="Breaks"
              totalHours={review?.summary.totalHoursPlanned ?? 0}
            />
            <CategoryBar
              colorClass="bg-muted-foreground"
              hours={review?.summary.categoryBreakdown.other ?? 0}
              label="Other"
              totalHours={review?.summary.totalHoursPlanned ?? 0}
            />
          </div>
        </div>

        {/* Daily overview grid */}
        <div>
          <h2 className="text-foreground mb-3 text-sm font-semibold">Daily Overview</h2>
          <div className="grid grid-cols-7 gap-3">
            {review?.days.map((day) => <DayCompact key={day.date} plan={day} />)}
          </div>
        </div>

        {/* Weekly reflection */}
        <WeeklyReflectionSection reflection={review?.reflection} weekStart={weekStart} />
      </div>
    </div>
  );
}
