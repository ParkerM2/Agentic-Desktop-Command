/**
 * Route History Store — Tracks recent navigation routes
 *
 * Ring buffer of the last 5 routes, used as error context for error reporting.
 */

import { create } from 'zustand';

const MAX_ROUTES = 5;

interface RouteHistoryState {
  routes: string[];

  pushRoute: (path: string) => void;
  getHistory: () => string[];
  reset: () => void;
}

const INITIAL_STATE = {
  routes: [] as string[],
};

export const useRouteHistoryStore = create<RouteHistoryState>()((set, get) => ({
  ...INITIAL_STATE,

  pushRoute: (path) =>
    set((state) => ({
      routes: [path, ...state.routes].slice(0, MAX_ROUTES),
    })),

  getHistory: () => get().routes,

  reset: () => set(INITIAL_STATE),
}));
