/**
 * Task UI Store — Client-side state only
 *
 * Selections, filters, table state, row expansion.
 * No data from main process lives here.
 */

import { create } from 'zustand';

import type { TaskStatus } from '@shared/types';

interface TaskUIState {
  selectedTaskId: string | null;
  filterStatus: TaskStatus | null;
  filterStatuses: TaskStatus[];
  searchQuery: string;
  expandedRowIds: Set<string>;
  gridSearchText: string;

  selectTask: (id: string | null) => void;
  setFilterStatus: (status: TaskStatus | null) => void;
  setFilterStatuses: (statuses: TaskStatus[]) => void;
  toggleFilterStatus: (status: TaskStatus) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  toggleRowExpansion: (taskId: string) => void;
  setGridSearchText: (text: string) => void;
}

export const useTaskUI = create<TaskUIState>((set) => ({
  selectedTaskId: null,
  filterStatus: null,
  filterStatuses: [],
  searchQuery: '',
  expandedRowIds: new Set<string>(),
  gridSearchText: '',

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
  clearFilters: () => set({ filterStatuses: [], searchQuery: '', gridSearchText: '' }),
  toggleRowExpansion: (taskId) =>
    set((s) => {
      const next = new Set(s.expandedRowIds);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return { expandedRowIds: next };
    }),
  setGridSearchText: (text) => set({ gridSearchText: text }),
}));
