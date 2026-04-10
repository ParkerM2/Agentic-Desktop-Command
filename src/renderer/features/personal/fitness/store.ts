/**
 * Fitness UI state store
 */

import { create } from 'zustand';

type FitnessTab = 'overview' | 'workouts' | 'body' | 'goals';

interface FitnessUIState {
  activeTab: FitnessTab;
  showWorkoutForm: boolean;
  setActiveTab: (tab: FitnessTab) => void;
  setShowWorkoutForm: (show: boolean) => void;
}

export const useFitnessUI = create<FitnessUIState>()((set) => ({
  activeTab: 'overview',
  showWorkoutForm: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowWorkoutForm: (show) => set({ showWorkoutForm: show }),
}));
