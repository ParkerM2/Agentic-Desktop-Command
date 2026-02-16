/**
 * Assistant Widget Store — UI state for the floating widget
 */

import { create } from 'zustand';

interface AssistantWidgetState {
  isOpen: boolean;
  voiceOutputEnabled: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  toggleVoiceOutput: () => void;
}

export const useAssistantWidgetStore = create<AssistantWidgetState>((set) => ({
  isOpen: false,
  voiceOutputEnabled: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggleVoiceOutput: () => set((state) => ({ voiceOutputEnabled: !state.voiceOutputEnabled })),
}));
