/**
 * usePlannerPage — logic for PlannerPage
 */

import { useState } from 'react';

import {
  useAddTimeBlock,
  useDay,
  useRemoveTimeBlock,
  useUpdateDay,
  useUpdateTimeBlock,
} from '../../api/usePlanner';
import { usePlannerEvents } from '../../hooks/usePlannerEvents';
import { usePlannerUI } from '../../store';

export function usePlannerPage() {
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

  return {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    plan,
    isLoading,
    addTimeBlock,
    updateTimeBlock,
    removeTimeBlock,
    reflection,
    setReflection,
    isEditingReflection,
    setIsEditingReflection,
    handlePrevDay,
    handleNextDay,
    handleGoToday,
    handleGoalsUpdate,
    handleGoalToggle,
    handleSaveReflection,
    handleStartEditReflection,
  };
}
