/**
 * useWeeklyReviewPage — logic for WeeklyReviewPage
 */

import { useState } from 'react';

import { useGenerateWeeklyReview, useWeeklyReview } from '../../api/useWeeklyReview';
import { getWeekMonday } from '../weekly-review-utils';

export function useWeeklyReviewPage() {
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
