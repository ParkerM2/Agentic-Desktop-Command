/**
 * Personal feature UI state store
 */

import { create } from 'zustand';

type PersonalTab = 'notes' | 'fitness' | 'planner' | 'briefing' | 'alerts' | 'changelog';

interface PersonalState {
  /** Active tab in the personal page */
  activeTab: PersonalTab;
  setActiveTab: (tab: PersonalTab) => void;
}

export const usePersonalStore = create<PersonalState>((set) => ({
  activeTab: 'notes',
  setActiveTab: (activeTab) => {
    set({ activeTab });
  },
}));
