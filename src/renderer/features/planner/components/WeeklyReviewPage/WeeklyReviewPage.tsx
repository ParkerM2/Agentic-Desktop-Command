/**
 * WeeklyReviewPage — Weekly planner data aggregation view
 */

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

import { Button, Heading, PageHeader, PageLayout } from '@ui';

import { CategoryBar } from '../CategoryBar';
import { DayCompact } from '../DayCompact';
import { StatCard } from '../StatCard';
import { formatWeekRange } from '../weekly-review-utils';
import { WeeklyReflectionSection } from '../WeeklyReflectionSection';

import { useWeeklyReviewPage } from './useWeeklyReviewPage';

export function WeeklyReviewPage() {
  const {
    weekStart,
    review,
    isLoading,
    generateReview,
    isThisWeek,
    handlePrevWeek,
    handleNextWeek,
    handleGoThisWeek,
    handleRefresh,
  } = useWeeklyReviewPage();

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Weekly Review</PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header controls */}
        <header className="border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-primary h-5 w-5" />
          </div>

          <div className="flex items-center gap-2">
            {isThisWeek ? null : (
              <Button
                className="text-primary hover:text-primary/80 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                size="sm"
                variant="ghost"
                onClick={handleGoThisWeek}
              >
                This Week
              </Button>
            )}

            <div className="border-border flex items-center rounded-md border">
              <Button
                aria-label="Previous week"
                className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
                size="icon"
                variant="ghost"
                onClick={handlePrevWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-foreground min-w-[160px] px-2 text-center text-sm font-medium">
                {review ? formatWeekRange(review.weekStartDate, review.weekEndDate) : ''}
              </span>
              <Button
                aria-label="Next week"
                className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
                size="icon"
                variant="ghost"
                onClick={handleNextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              aria-label="Refresh summary"
              disabled={generateReview.isPending}
              size="icon"
              variant="ghost"
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors',
                generateReview.isPending && 'animate-spin',
              )}
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

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
            <Heading as="h2" className="mb-4 text-sm">
              Time Distribution by Category
            </Heading>
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
            <Heading as="h2" className="mb-3 text-sm">Daily Overview</Heading>
            <div className="grid grid-cols-7 gap-3">
              {review?.days.map((day) => <DayCompact key={day.date} plan={day} />)}
            </div>
          </div>

          {/* Weekly reflection */}
          <WeeklyReflectionSection reflection={review?.reflection} weekStart={weekStart} />
        </div>
      </div>
    </PageLayout>
  );
}
