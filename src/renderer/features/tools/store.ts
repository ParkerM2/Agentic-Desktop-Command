import { create } from 'zustand';

interface ToolsUIState {
  activeTab: 'config' | 'workflow';
  setActiveTab: (tab: 'config' | 'workflow') => void;
}

export const useToolsUI = create<ToolsUIState>((set) => ({
  activeTab: 'workflow',
  setActiveTab: (activeTab) => set({ activeTab }),
}));
