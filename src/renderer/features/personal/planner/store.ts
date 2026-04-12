/**
 * Planner UI Store — Client-side state only
 */

import { create } from 'zustand';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface PlannerUIState {
  selectedDate: string;
  viewMode: 'day' | 'week';
  isEditing: boolean;
  showCalendarOverlay: boolean;

  setSelectedDate: (date: string) => void;
  setViewMode: (mode: 'day' | 'week') => void;
  setIsEditing: (editing: boolean) => void;
  setShowCalendarOverlay: (show: boolean) => void;
}

export const usePlannerUI = create<PlannerUIState>((set) => ({
  selectedDate: getTodayString(),
  viewMode: 'day',
  isEditing: false,
  showCalendarOverlay: true,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsEditing: (editing) => set({ isEditing: editing }),
  setShowCalendarOverlay: (show) => set({ showCalendarOverlay: show }),
}));
