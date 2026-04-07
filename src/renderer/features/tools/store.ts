import { create } from 'zustand';

interface ToolsUIState {
  activeTab: 'config' | 'workflow';
  selectedTemplateId: string | null;
  setActiveTab: (tab: 'config' | 'workflow') => void;
  setSelectedTemplateId: (id: string | null) => void;
}

export const useToolsUI = create<ToolsUIState>((set) => ({
  activeTab: 'workflow',
  selectedTemplateId: null,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),
}));
