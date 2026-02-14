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
  MessageSquare,
  RefreshCw,
  Target,
} from 'lucide-react';

import { ROUTES } from '@shared/constants';
import type { DailyPlan, TimeBlock } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import {
  useWeeklyReview,
  useGenerateWeeklyReview,
  useUpdateWeeklyReflection,
} from '../api/useWeeklyReview';

/**
 * Get Monday of the week containing the given date
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Format date range for display
 */
function formatWeekRange(startDate: string, endDate: string): string {
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
function formatDayCompact(dateStr: string): { dayName: string; dayNumber: string } {
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: String(date.getDate()),
  };
}

/**
 * Check if date is today
 */
function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

/**
 * Get time block type color
 */
function getBlockTypeColor(type: TimeBlock['type']): string {
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

/**
 * Stat card component
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <div className="mt-2">
        <span className="text-foreground text-2xl font-bold">{value}</span>
        {subtext ? <span className="text-muted-foreground ml-1 text-sm">{subtext}</span> : null}
      </div>
    </div>
  );
}

/**
 * Category breakdown bar
 */
interface CategoryBarProps {
  label: string;
  hours: number;
  totalHours: number;
  colorClass: string;
}

function CategoryBar({ label, hours, totalHours, colorClass }: CategoryBarProps) {
  const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground capitalize">{label}</span>
        <span className="text-muted-foreground">{hours}h</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Compact daily view for week overview
 */
interface DayCompactProps {
  plan: DailyPlan;
}

/**
 * Display for weekly reflection (empty or with text)
 */
function ReflectionDisplay({ text }: { text?: string }) {
  if (text) {
    return <p className="text-muted-foreground text-sm">{text}</p>;
  }
  return (
    <p className="text-muted-foreground text-xs italic">
      No weekly reflection yet. Take a moment to review your week.
    </p>
  );
}

function DayCompact({ plan }: DayCompactProps) {
  const { dayName, dayNumber } = formatDayCompact(plan.date);
  const today = isToday(plan.date);
  const hasData = plan.goals.length > 0 || plan.timeBlocks.length > 0;

  return (
    <div
      className={cn('bg-card border-border rounded-lg border p-3', today && 'ring-primary ring-2')}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{dayName}</span>
        <span className={cn('text-sm font-medium', today ? 'text-primary' : 'text-foreground')}>
          {dayNumber}
        </span>
      </div>

      {hasData ? (
        <div className="space-y-2">
          {plan.goals.length > 0 ? (
            <div className="flex items-center gap-1">
              <Target className="text-primary h-3 w-3" />
              <span className="text-muted-foreground text-xs">
                {plan.goals.length} goal{plan.goals.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}

          {plan.timeBlocks.length > 0 ? (
            <div className="flex items-center gap-1">
              <Clock className="text-info h-3 w-3" />
              <span className="text-muted-foreground text-xs">
                {plan.timeBlocks.length} block{plan.timeBlocks.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}

          {plan.timeBlocks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {plan.timeBlocks.slice(0, 3).map((block) => (
                <span
                  key={block.id}
                  className={cn('rounded px-1.5 py-0.5 text-[10px]', getBlockTypeColor(block.type))}
                >
                  {block.label.slice(0, 12)}
                  {block.label.length > 12 ? '...' : ''}
                </span>
              ))}
              {plan.timeBlocks.length > 3 ? (
                <span className="text-muted-foreground text-[10px]">
                  +{plan.timeBlocks.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs italic">No data</p>
      )}
    </div>
  );
}

export function WeeklyReviewPage() {
  const [weekStart, setWeekStart] = useState(() =>
    getWeekMonday(new Date().toISOString().slice(0, 10)),
  );
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState('');

  const { data: review, isLoading } = useWeeklyReview(weekStart);
  const generateReview = useGenerateWeeklyReview();
  const updateReflection = useUpdateWeeklyReflection();

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

  function handleStartEditReflection() {
    setReflectionText(review?.reflection ?? '');
    setIsEditingReflection(true);
  }

  function handleSaveReflection() {
    updateReflection.mutate({ startDate: weekStart, reflection: reflectionText });
    setIsEditingReflection(false);
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
            {review?.days.map((day) => (
              <DayCompact key={day.date} plan={day} />
            ))}
          </div>
        </div>

        {/* Weekly reflection */}
        <div className="bg-card border-border rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-foreground text-sm font-semibold">Weekly Reflection</h2>
            {isEditingReflection ? null : (
              <button
                className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors"
                onClick={handleStartEditReflection}
              >
                <MessageSquare className="h-3 w-3" />
                {review?.reflection ? 'Edit' : 'Add'}
              </button>
            )}
          </div>

          {isEditingReflection ? (
            <div className="space-y-2">
              <textarea
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                placeholder="Reflect on your week. What went well? What could be improved?"
                rows={4}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1 text-xs transition-colors"
                  onClick={() => setIsEditingReflection(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                  disabled={updateReflection.isPending}
                  onClick={handleSaveReflection}
                >
                  {updateReflection.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <ReflectionDisplay text={review?.reflection} />
          )}
        </div>
      </div>
    </div>
  );
}
