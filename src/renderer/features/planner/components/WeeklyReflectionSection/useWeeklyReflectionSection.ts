/**
 * useWeeklyReflectionSection — logic for WeeklyReflectionSection
 */

import { useState } from 'react';

import { useUpdateWeeklyReflection } from '../../api/useWeeklyReview';

export function useWeeklyReflectionSection(weekStart: string, reflection?: string) {
  const [isEditing, setIsEditing] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const updateReflection = useUpdateWeeklyReflection();

  function handleStartEdit() {
    setReflectionText(reflection ?? '');
    setIsEditing(true);
  }

  function handleSave() {
    updateReflection.mutate({ startDate: weekStart, reflection: reflectionText });
    setIsEditing(false);
  }

  return {
    isEditing,
    setIsEditing,
    reflectionText,
    setReflectionText,
    updateReflection,
    handleStartEdit,
    handleSave,
  };
}
