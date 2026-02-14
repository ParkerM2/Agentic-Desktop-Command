/**
 * Task UI Store — Client-side state only
 *
 * Selections, filters, kanban ordering, table state.
 * No data from main process lives here.
 */

import { create } from 'zustand';

import type { TaskStatus } from '@shared/types';

interface TaskUIState {
  selectedTaskId: string | null;
  filterStatus: TaskStatus | null;
  filterStatuses: TaskStatus[];
  searchQuery: string;
  kanbanColumnOrder: Record<string, string[]>;

  selectTask: (id: string | null) => void;
  setFilterStatus: (status: TaskStatus | null) => void;
  setFilterStatuses: (statuses: TaskStatus[]) => void;
  toggleFilterStatus: (status: TaskStatus) => void;
  setSearchQuery: (query: string) => void;
  setColumnOrder: (status: string, taskIds: string[]) => void;
  clearFilters: () => void;
}

export const useTaskUI = create<TaskUIState>((set) => ({
  selectedTaskId: null,
  filterStatus: null,
  filterStatuses: [],
  searchQuery: '',
  kanbanColumnOrder: {},

  selectTask: (id) => set({ selectedTaskId: id }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterStatuses: (statuses) => set({ filterStatuses: statuses }),
  toggleFilterStatus: (status) =>
    set((s) => {
      const current = s.filterStatuses;
      const exists = current.includes(status);
      return {
        filterStatuses: exists ? current.filter((st) => st !== status) : [...current, status],
      };
    }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setColumnOrder: (status, taskIds) =>
    set((s) => ({
      kanbanColumnOrder: { ...s.kanbanColumnOrder, [status]: taskIds },
    })),
  clearFilters: () => set({ filterStatuses: [], searchQuery: '' }),
}));
