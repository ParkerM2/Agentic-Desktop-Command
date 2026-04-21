/**
 * useWeeklyReviewPage — logic for WeeklyReviewPage
 */

import { useState } from 'react';

import { useToday } from '@renderer/shared/hooks/useToday';

import { useGenerateWeeklyReview, useWeeklyReview } from '../../api/useWeeklyReview';
import { useWeekDayNavigation } from '../../hooks/useWeekDayNavigation';
import { getWeekMonday } from '../weekly-review-utils';

export function useWeeklyReviewPage() {
  const today = useToday();

  const [weekStart, setWeekStart] = useState(() => getWeekMonday(today));

  const { data: review, isLoading } = useWeeklyReview(weekStart);
  const generateReview = useGenerateWeeklyReview();

  const { handlePrevWeek, handleNextWeek } = useWeekDayNavigation({
    currentDate: weekStart,
    onDateChange: setWeekStart,
  });

  function handleGoThisWeek() {
    setWeekStart(getWeekMonday(today));
  }

  function handleRefresh() {
    generateReview.mutate(weekStart);
  }

  const isThisWeek = weekStart === getWeekMonday(today);

  return {
    weekStart,
    review,
    isLoading,
    generateReview,
    isThisWeek,
    handlePrevWeek,
    handleNextWeek,
    handleGoThisWeek,
    handleRefresh,
  };
}
