/**
 * PlannerPage — Main daily planner layout
 */

import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
} from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Heading, PageContent, PageHeader, PageLayout, Text, Textarea } from '@ui';

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
    return <Text className="text-muted-foreground text-sm">{text}</Text>;
  }
  return <Text className="text-muted-foreground text-xs italic">No reflection yet.</Text>;
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

  function handleGoalToggle(goalText: string) {
    const current = plan?.completedGoals ?? [];
    const next = current.includes(goalText)
      ? current.filter((g) => g !== goalText)
      : [...current, goalText];
    updateDay.mutate({ date: selectedDate, completedGoals: next });
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
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Daily Planner</PageHeader.Title>
          <PageHeader.Actions>
            {isToday(selectedDate) ? null : (
              <Button
                className="text-primary hover:text-primary/80 px-2.5 py-1 text-xs"
                size="sm"
                type="button"
                variant="ghost"
                onClick={handleGoToday}
              >
                Today
              </Button>
            )}

            <div className="border-border flex items-center rounded-md border">
              <Button
                aria-label="Previous day"
                className="h-auto p-1.5"
                size="icon"
                type="button"
                variant="ghost"
                onClick={handlePrevDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-foreground min-w-[180px] px-2 text-center text-sm font-medium">
                {formatDateLabel(selectedDate)}
              </span>
              <Button
                aria-label="Next day"
                className="h-auto p-1.5"
                size="icon"
                type="button"
                variant="ghost"
                onClick={handleNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-border ml-2 flex rounded-md border">
              <Button
                type="button"
                variant={viewMode === 'day' ? 'primary' : 'ghost'}
                className={cn(
                  'h-auto rounded-r-none px-3 py-1 text-xs',
                  viewMode === 'day' ? '' : 'text-muted-foreground',
                )}
                onClick={() => setViewMode('day')}
              >
                Day
              </Button>
              <Button
                type="button"
                variant={viewMode === 'week' ? 'primary' : 'ghost'}
                className={cn(
                  'h-auto rounded-l-none px-3 py-1 text-xs',
                  viewMode === 'week' ? '' : 'text-muted-foreground',
                )}
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>

            <Link
              className="text-muted-foreground hover:text-primary ml-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              to={ROUTES.PLANNER_WEEKLY}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Weekly Review
            </Link>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>

      <PageContent>
        {viewMode === 'week' ? (
          <WeekOverview selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        ) : null}

        <div className={cn('grid gap-6', viewMode === 'week' ? 'mt-6 grid-cols-1' : 'grid-cols-2')}>
          {/* Left column — Goals */}
          <div className="space-y-6">
            <GoalsList
              completedGoals={plan?.completedGoals ?? []}
              goals={plan?.goals ?? []}
              onToggle={handleGoalToggle}
              onUpdate={handleGoalsUpdate}
            />


            {/* Reflection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Heading as="h3" className="text-foreground text-sm font-semibold">Reflection</Heading>
                {isEditingReflection ? null : (
                  <Button
                    className="text-muted-foreground hover:text-primary h-auto gap-1 p-0 text-xs"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={handleStartEditReflection}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {plan?.reflection ? 'Edit' : 'Add'}
                  </Button>
                )}
              </div>

              {isEditingReflection ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="How did today go? What did you learn?"
                    resize="none"
                    rows={4}
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditingReflection(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleSaveReflection}
                    >
                      Save
                    </Button>
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
            scheduledTasks={plan?.scheduledTasks ?? []}
            timeBlocks={plan?.timeBlocks ?? []}
            onAdd={(block) => addTimeBlock.mutate({ date: selectedDate, timeBlock: block })}
            onRemove={(blockId) => removeTimeBlock.mutate({ date: selectedDate, blockId })}
            onUpdate={(blockId, updates) =>
              updateTimeBlock.mutate({ date: selectedDate, blockId, updates })
            }
          />
        </div>
      </PageContent>
    </PageLayout>
  );
}
