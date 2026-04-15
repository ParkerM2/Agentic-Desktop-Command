import { create } from 'zustand';

type PlanningTab = 'ideation' | 'insights';

interface PlanningState {
  activeTab: PlanningTab;
  setActiveTab: (tab: PlanningTab) => void;
}

export const usePlanningStore = create<PlanningState>()((set) => ({
  activeTab: 'ideation',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export type { PlanningTab };
