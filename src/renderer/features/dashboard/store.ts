/**
 * Dashboard Store — UI state for the dashboard feature
 */

import { create } from 'zustand';

interface QuickCapture {
  id: string;
  text: string;
  createdAt: string;
}

interface DashboardState {
  quickCaptures: QuickCapture[];
  addCapture: (text: string) => void;
  removeCapture: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  quickCaptures: [],

  addCapture: (text) =>
    set((state) => ({
      quickCaptures: [
        {
          id: crypto.randomUUID(),
          text,
          createdAt: new Date().toISOString(),
        },
        ...state.quickCaptures,
      ],
    })),

  removeCapture: (id) =>
    set((state) => ({
      quickCaptures: state.quickCaptures.filter((capture) => capture.id !== id),
    })),
}));
