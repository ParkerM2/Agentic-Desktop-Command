/**
 * Assistant Widget Store — UI state for the floating widget
 */

import { create } from 'zustand';

interface AssistantWidgetState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useAssistantWidgetStore = create<AssistantWidgetState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
