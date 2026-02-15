/**
 * Assistant Store — UI state for the assistant feature
 */

import { create } from 'zustand';

import type { IntentType } from '@shared/types';

interface ResponseEntry {
  id: string;
  input: string;
  response: string;
  type: 'text' | 'action' | 'error';
  intent?: IntentType;
  timestamp: string;
}

interface AssistantState {
  isThinking: boolean;
  currentResponse: string;
  commandDraft: string;
  responseHistory: ResponseEntry[];
  unreadCount: number;
  setIsThinking: (isThinking: boolean) => void;
  setCurrentResponse: (response: string) => void;
  clearCurrentResponse: () => void;
  setCommandDraft: (draft: string) => void;
  addResponseEntry: (entry: Omit<ResponseEntry, 'id' | 'timestamp'>) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export type { ResponseEntry };

export const useAssistantStore = create<AssistantState>((set) => ({
  isThinking: false,
  currentResponse: '',
  commandDraft: '',
  responseHistory: [],
  unreadCount: 0,

  setIsThinking: (isThinking) => set({ isThinking }),

  setCurrentResponse: (response) => set({ currentResponse: response }),

  clearCurrentResponse: () => set({ currentResponse: '' }),

  setCommandDraft: (draft) => set({ commandDraft: draft }),

  addResponseEntry: (entry) =>
    set((state) => ({
      responseHistory: [
        ...state.responseHistory,
        {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  resetUnread: () => set({ unreadCount: 0 }),
}));
