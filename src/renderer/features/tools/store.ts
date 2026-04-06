import { create } from 'zustand';

type ToolsTab = 'roadmap' | 'ideation' | 'insights' | 'changelog' | 'github';

interface ToolsState {
  activeTab: ToolsTab;
  setActiveTab: (tab: ToolsTab) => void;
}

export const useToolsStore = create<ToolsState>()((set) => ({
  activeTab: 'roadmap',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export type { ToolsTab };
