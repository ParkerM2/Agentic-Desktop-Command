/**
 * Ideation UI state store
 */

import { create } from 'zustand';

import type { IdeaCategory } from '@shared/types';

interface IdeationUIState {
  activeFilter: IdeaCategory | 'all';
  isCreating: boolean;
  setActiveFilter: (filter: IdeaCategory | 'all') => void;
  setCreating: (creating: boolean) => void;
}

export const useIdeationUI = create<IdeationUIState>()((set) => ({
  activeFilter: 'all',
  isCreating: false,
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setCreating: (creating) => set({ isCreating: creating }),
}));
