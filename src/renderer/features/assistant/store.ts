/**
 * Assistant Store — UI state for the assistant feature
 */

import { create } from 'zustand';

interface UserEntry {
  kind: 'user';
  id: string;
  input: string;
  timestamp: string;
}

interface ResponseEntry {
  kind: 'response';
  id: string;
  response: string;
  type: 'text' | 'error';
  timestamp: string;
}

type ChatEntry = UserEntry | ResponseEntry;

interface AssistantState {
  isThinking: boolean;
  currentResponse: string;
  commandDraft: string;
  responseHistory: ChatEntry[];
  unreadCount: number;
  setIsThinking: (isThinking: boolean) => void;
  setCurrentResponse: (response: string) => void;
  clearCurrentResponse: () => void;
  setCommandDraft: (draft: string) => void;
  addUserEntry: (input: string) => void;
  addResponseEntry: (entry: { response: string; type: 'text' | 'error' }) => void;
  clearHistory: () => void;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export type { ChatEntry, ResponseEntry, UserEntry };

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

  addUserEntry: (input) =>
    set((state) => ({
      responseHistory: [
        ...state.responseHistory,
        {
          kind: 'user' as const,
          id: crypto.randomUUID(),
          input,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  addResponseEntry: ({ response, type }) =>
    set((state) => ({
      responseHistory: [
        ...state.responseHistory,
        {
          kind: 'response' as const,
          id: crypto.randomUUID(),
          response,
          type,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  clearHistory: () => set({ responseHistory: [] }),

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  resetUnread: () => set({ unreadCount: 0 }),
}));
