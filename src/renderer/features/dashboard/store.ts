/**
 * Dashboard Store — UI state for the dashboard feature
 *
 * Quick captures are now persisted via IPC (dashboard.captures.*).
 * This store only holds transient UI state.
 */

import { create } from 'zustand';

interface DashboardState {
  /** Placeholder for future UI state (e.g., selected widget, collapsed sections) */
  _initialized: boolean;
}

export const useDashboardStore = create<DashboardState>()(() => ({
  _initialized: true,
}));
