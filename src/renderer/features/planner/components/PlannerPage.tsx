/**
 * PlannerPage — Main daily planner layout
 */

import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
} from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';

import {
  useDay,
  useUpdateDay,
  useAddTimeBlock,
  useUpdateTimeBlock,
  useRemoveTimeBlock,
} from '../api/usePlanner';
import { usePlannerEvents } from '../hooks/usePlannerEvents';
import { usePlannerUI } from '../store';

import { DayView } from './DayView';
import { GoalsList } from './GoalsList';
import { WeekOverview } from './WeekOverview';

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function ReflectionDisplay({ text }: { text?: string }) {
  if (text) {
    return <p className="text-muted-foreground text-sm">{text}</p>;
  }
  return <p className="text-muted-foreground text-xs italic">No reflection yet.</p>;
}

export function PlannerPage() {
  const { selectedDate, setSelectedDate, viewMode, setViewMode } = usePlannerUI();
  const { data: plan, isLoading } = useDay(selectedDate);
  const updateDay = useUpdateDay();
  const addTimeBlock = useAddTimeBlock();
  const updateTimeBlock = useUpdateTimeBlock();
  const removeTimeBlock = useRemoveTimeBlock();
  const [reflection, setReflection] = useState('');
  const [isEditingReflection, setIsEditingReflection] = useState(false);

  usePlannerEvents();

  function handlePrevDay() {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().slice(0, 10));
  }

  function handleNextDay() {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + 1);
    setSelectedDate(current.toISOString().slice(0, 10));
  }

  function handleGoToday() {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  }

  function handleGoalsUpdate(goals: string[]) {
    updateDay.mutate({ date: selectedDate, goals });
  }

  function handleSaveReflection() {
    updateDay.mutate({ date: selectedDate, reflection });
    setIsEditingReflection(false);
  }

  function handleStartEditReflection() {
    setReflection(plan?.reflection ?? '');
    setIsEditingReflection(true);
  }

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
          <Calendar className="text-primary h-5 w-5" />
          <h1 className="text-foreground text-lg font-semibold">Daily Planner</h1>
        </div>

        <div className="flex items-center gap-2">
          {isToday(selectedDate) ? null : (
            <button
              className="text-primary hover:text-primary/80 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              onClick={handleGoToday}
            >
              Today
            </button>
          )}

          <div className="border-border flex items-center rounded-md border">
            <button
              aria-label="Previous day"
              className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
              onClick={handlePrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-foreground min-w-[180px] px-2 text-center text-sm font-medium">
              {formatDateLabel(selectedDate)}
            </span>
            <button
              aria-label="Next day"
              className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="border-border ml-2 flex rounded-md border">
            <button
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                viewMode === 'day'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                viewMode === 'week'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>

          <Link
            className="text-muted-foreground hover:text-primary ml-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            to={ROUTES.PLANNER_WEEKLY}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Weekly Review
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'week' ? (
          <WeekOverview selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        ) : null}

        <div className={cn('grid gap-6', viewMode === 'week' ? 'mt-6 grid-cols-1' : 'grid-cols-2')}>
          {/* Left column — Goals */}
          <div className="space-y-6">
            <GoalsList goals={plan?.goals ?? []} onUpdate={handleGoalsUpdate} />

            {/* Reflection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground text-sm font-semibold">Reflection</h3>
                {isEditingReflection ? null : (
                  <button
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors"
                    onClick={handleStartEditReflection}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {plan?.reflection ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>

              {isEditingReflection ? (
                <div className="space-y-2">
                  <textarea
                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                    placeholder="How did today go? What did you learn?"
                    rows={4}
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
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
                      onClick={handleSaveReflection}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <ReflectionDisplay text={plan?.reflection} />
              )}
            </div>
          </div>

          {/* Right column — Schedule */}
          <DayView
            date={selectedDate}
            timeBlocks={plan?.timeBlocks ?? []}
            onAdd={(block) => addTimeBlock.mutate({ date: selectedDate, timeBlock: block })}
            onRemove={(blockId) => removeTimeBlock.mutate({ date: selectedDate, blockId })}
            onUpdate={(blockId, updates) =>
              updateTimeBlock.mutate({ date: selectedDate, blockId, updates })
            }
          />
        </div>
      </div>
    </div>
  );
}
