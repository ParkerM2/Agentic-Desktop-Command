import { create } from 'zustand';

import type { AssistantResponse } from '@shared/types/assistant';

const MAX_HISTORY = 50;

interface CommandBarState {
  // State
  isProcessing: boolean;
  lastResponse: AssistantResponse | null;
  inputHistory: string[];
  historyIndex: number;
  isToastVisible: boolean;

  // Actions
  setProcessing: (value: boolean) => void;
  setLastResponse: (response: AssistantResponse | null) => void;
  addToHistory: (input: string) => void;
  setHistoryIndex: (index: number) => void;
  showToast: () => void;
  hideToast: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  isProcessing: false,
  lastResponse: null as AssistantResponse | null,
  inputHistory: [] as string[],
  historyIndex: -1,
  isToastVisible: false,
};

export const useCommandBarStore = create<CommandBarState>()((set) => ({
  ...INITIAL_STATE,

  setProcessing: (value) => set({ isProcessing: value }),
  setLastResponse: (response) => set({ lastResponse: response }),
  addToHistory: (input) =>
    set((s) => ({
      inputHistory: [input, ...s.inputHistory].slice(0, MAX_HISTORY),
      historyIndex: -1,
    })),
  setHistoryIndex: (index) => set({ historyIndex: index }),
  showToast: () => set({ isToastVisible: true }),
  hideToast: () => set({ isToastVisible: false }),
  reset: () => set(INITIAL_STATE),
}));
