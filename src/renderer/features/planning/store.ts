import { create } from 'zustand';

type PlanningTab = 'roadmap' | 'ideation' | 'insights';

interface PlanningState {
  activeTab: PlanningTab;
  setActiveTab: (tab: PlanningTab) => void;
}

export const usePlanningStore = create<PlanningState>()((set) => ({
  activeTab: 'roadmap',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export type { PlanningTab };
